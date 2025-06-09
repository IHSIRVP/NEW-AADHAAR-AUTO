from tkinter import Tk, Label, Entry, Button, StringVar, DISABLED, NORMAL, Toplevel
from PIL import Image, ImageTk
import os, time, threading, fitz, requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from PyPDF2 import PdfReader, PdfWriter
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import base64

# === Config ===
downloads_folder = os.path.expanduser("~/Downloads")
screenshot_path = "aadhaar_page.png"
chrome_binary_path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
bearer_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0ODM1MDA1MywianRpIjoiYTJmOTU5YzMtNzM2MS00M2NlLTg3ZTEtMDFmMGRiOWFiYmE4IiwidHlwZSI6ImFjY2VzcyIsImlkZW50aXR5IjoiZGV2LnN1bnRlY2tyZWFsdHlAc3VyZXBhc3MuaW8iLCJuYmYiOjE3NDgzNTAwNTMsImV4cCI6MTc1MDk0MjA1MywiZW1haWwiOiJzdW50ZWNrcmVhbHR5QHN1cmVwYXNzLmlvIiwidGVuYW50X2lkIjoibWFpbiIsInVzZXJfY2xhaW1zIjp7InNjb3BlcyI6WyJ1c2VyIl19fQ.dlZP9ep1mbsAoqov_ARLY5akUiavHJLLpY3qrK4jLT8"

status_text = {"status": "🔄 Starting...", "pdf_ready": False, "qr_text": ""}

# === Tkinter GUI ===
root = Tk()
root.title("Aadhaar Automation UI")
root.geometry("500x800")

aadhaar_var = StringVar()
captcha_var = StringVar()
otp_var = StringVar()

aadhaar_label = Label(root, text="Enter Aadhaar Number:")
aadhaar_entry = Entry(root, textvariable=aadhaar_var, state=DISABLED)
aadhaar_submit_btn = Button(root, text="Submit Aadhaar", state=DISABLED)

captcha_label_img = Label(root)
captcha_label = Label(root, text="Enter CAPTCHA:")
captcha_entry = Entry(root, textvariable=captcha_var)
captcha_submit_btn = Button(root, text="Submit CAPTCHA", state=DISABLED)

otp_label = Label(root, text="Enter OTP:")
otp_entry = Entry(root, textvariable=otp_var)
otp_submit_btn = Button(root, text="Submit OTP", state=DISABLED)

status_label = Label(root, text=status_text["status"])
response_display = Label(root, text="", justify="left", wraplength=480, anchor="w")

aadhaar_label.pack()
aadhaar_entry.pack()
aadhaar_submit_btn.pack(pady=10)
status_label.pack(pady=10)
response_display.pack(pady=10)

# === Chrome Setup ===
chrome_options = Options()
chrome_options.binary_location = chrome_binary_path
prefs = {"download.default_directory": downloads_folder}
chrome_options.add_experimental_option("prefs", prefs)
chromedriver_path = "/Users/rishivijaywargiya/chromedriver-mac-arm64/chromedriver"
driver = webdriver.Chrome(service=Service(chromedriver_path), options=chrome_options)

# === Helper ===
def update_status(msg):
    status_label.config(text=msg)
    status_text["status"] = msg

def read_qr_code_from_image(image_path):
    url = "http://api.qrserver.com/v1/read-qr-code/"
    with open(image_path, "rb") as f:
        files = {"file": f}
        response = requests.post(url, files=files)
    try:
        data = response.json()
        return data[0]["symbol"][0]["data"]
    except Exception as e:
        print(f"❌ QR decode error: {e}")
        return None

def verify_aadhaar_qr_with_surepass(qr_text):
    url = "https://sandbox.surepass.io/api/v1/aadhaar/upload/qr"
    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json"
    }
    payload = {"qr_text": qr_text}
    try:
        response = requests.post(url, headers=headers, json=payload)
        result = response.json()
        if result.get("success"):
            data = result["data"]
            status_text["qr_text"] = data
            display_text = f"✅ Aadhaar Verified\n👤 Name: {data.get('full_name')}\n🎂 DOB: {data.get('dob')}\n⚧ Gender: {data.get('gender')}"
            response_display.config(text=display_text)
        else:
            error_msg = result.get("message", "Unknown error")
            response_display.config(text=f"❌ Verification failed: {error_msg}")
    except Exception as e:
        response_display.config(text=f"❌ API call error:\n{e}")

def wait_for_pdf_download(timeout=60):
    start_time = time.time()
    while time.time() - start_time < timeout:
        for file in os.listdir(downloads_folder):
            if file.startswith("EAadhaar_") and file.endswith(".pdf") and not file.endswith(".crdownload"):
                return os.path.join(downloads_folder, file)
        time.sleep(1)
    return None

def unlock_pdf_and_process(path):
    def run():
        prompt = Toplevel(root)
        prompt.title("Unlock PDF")
        prompt.geometry("300x120")
        pass_var = StringVar()
        Label(prompt, text="Enter PDF Password:").pack(pady=5)
        Entry(prompt, textvariable=pass_var, show="*").pack()

        def try_unlock():
            try:
                with open(path, "rb") as f:
                    reader = PdfReader(f)
                    if reader.decrypt(pass_var.get()):
                        writer = PdfWriter()
                        for p in reader.pages:
                            writer.add_page(p)
                        if not os.path.exists("static"):
                            os.makedirs("static")
                        unlocked_path = os.path.join("static", "unlocked.pdf")
                        with open(unlocked_path, "wb") as out:
                            writer.write(out)
                        update_status("✅ PDF Unlocked.")
                        status_text["pdf_ready"] = True
                        img_path = extract_region_from_pdf(unlocked_path)
                        if img_path:
                            qr_data = read_qr_code_from_image(img_path)
                            if qr_data:
                                status_text["qr_text"] = qr_data
                                verify_aadhaar_qr_with_surepass(qr_data)
                        prompt.destroy()
                    else:
                        update_status("❌ Wrong password.")
            except Exception as e:
                update_status(f"❌ Unlock error: {e}")

        Button(prompt, text="Unlock", command=try_unlock).pack(pady=10)
    threading.Thread(target=run).start()

def extract_region_from_pdf(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        page = doc.load_page(0)
        rect = fitz.Rect(200, 400, 300, 550)
        mat = fitz.Matrix(4, 4)
        pix = page.get_pixmap(matrix=mat, clip=rect)
        output_img = "static/extracted_region.png"
        pix.save(output_img)
        return output_img
    except Exception as e:
        print(f"❌ PDF extract error: {e}")
        return None

# === Submit OTP ===
def submit_otp():
    def run():
        try:
            otp_input = WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.XPATH, "//input[@name='otp']")))
            otp_input.clear()
            for o in otp_var.get():
                otp_input.send_keys(o)
                time.sleep(0.1)
            ActionChains(driver).move_to_element_with_offset(driver.find_element(By.TAG_NAME, "body"), 10, 10).click().perform()
            update_status("✅ OTP entered. Waiting for download...")
            for _ in range(30):
                try:
                    btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Verify') and contains(text(), 'Download')]")
                    if btn.value_of_css_property("cursor") == "pointer":
                        driver.execute_script("arguments[0].click();", btn)
                        update_status("📥 Download started.")
                        time.sleep(5)
                        path = wait_for_pdf_download()
                        if path:
                            unlock_pdf_and_process(path)
                        return
                except:
                    pass
                time.sleep(1)
            update_status("❌ 'Verify & Download' not clickable.")
        except Exception as e:
            update_status(f"❌ OTP error: {e}")
    threading.Thread(target=run).start()

# === Load Page ===
def load_page():
    def run():
        try:
            driver.get("https://myaadhaar.uidai.gov.in/genricDownloadAadhaar/en")
            WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.NAME, "uid")))
            update_status("✅ Page loaded. Enter Aadhaar number.")
            aadhaar_entry.config(state=NORMAL)
            aadhaar_submit_btn.config(state=NORMAL)
        except Exception as e:
            update_status(f"❌ Failed to load page: {e}")
    threading.Thread(target=run).start()

# === Flask API ===
app = Flask(__name__)
CORS(app)

@app.route('/captcha-image', methods=['GET'])
def get_captcha_image():
    return send_from_directory('static', 'captcha_only.png')



@app.route('/set-aadhaar', methods=['POST'])
def set_aadhaar():
    data = request.json
    aadhaar_number = data.get("aadhaar")
    if aadhaar_number:
        aadhaar_var.set(aadhaar_number)
        if aadhaar_entry['state'] == NORMAL:
            submit_aadhaar()
        # Wait until captcha image exists
        for _ in range(20):
            if os.path.exists("static/captcha_only.png"):
                break
            time.sleep(0.1)
        captcha_ready = os.path.exists("static/captcha_only.png")
        return jsonify({"status": "success", "message": "Aadhaar set", "captcha_ready": captcha_ready})
    return jsonify({"status": "error", "message": "No Aadhaar number received"}), 400

def submit_aadhaar():
    def run():
        try:
            aadhaar_input = driver.find_element(By.NAME, "uid")
            aadhaar_input.clear()
            aadhaar_input.send_keys(aadhaar_var.get())
            update_status("📷 Capturing CAPTCHA...")
            time.sleep(2)  # Give CAPTCHA a moment to load
            captcha_input = WebDriverWait(driver, 15).until(EC.element_to_be_clickable((By.XPATH, "//input[@name='captcha']")))
            driver.save_screenshot(screenshot_path)
            x, y = captcha_input.location['x'], captcha_input.location['y']
            if not os.path.exists("static"):
                os.makedirs("static")
            img = Image.open(screenshot_path).crop((x + 200, y + 300, x + 2000, y + 450))
            img.save("static/captcha_only.png")
            captcha_image = ImageTk.PhotoImage(Image.open("static/captcha_only.png"))
            captcha_label_img.config(image=captcha_image)
            captcha_label_img.image = captcha_image
            captcha_label_img.pack()
            captcha_label.pack()
            captcha_entry.pack()
            captcha_submit_btn.config(state=NORMAL)
            captcha_submit_btn.pack(pady=10)
            update_status("✍️ Enter CAPTCHA.")
        except Exception as e:
            update_status(f"❌ Aadhaar error: {e}")
    threading.Thread(target=run).start()


@app.route('/set-captcha', methods=['POST'])
def set_captcha():
    data = request.json
    captcha = data.get("captcha")
    if captcha:
        captcha_var.set(captcha)
        if captcha_submit_btn['state'] == NORMAL:
            submit_captcha()
        return jsonify({"status": "success", "message": "CAPTCHA set"})
    return jsonify({"status": "error", "message": "No CAPTCHA received"}), 400

def submit_captcha():
    def run():
        try:
            captcha_input = driver.find_element(By.XPATH, "//input[@name='captcha']")
            captcha_input.clear()
            for c in captcha_var.get():
                captcha_input.send_keys(c)
                time.sleep(0.1)
            ActionChains(driver).move_to_element_with_offset(driver.find_element(By.TAG_NAME, "body"), 5, 5).click().perform()
            WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Send OTP')]"))).click()
            update_status("📨 OTP sent. Enter OTP.")
            otp_label.pack()
            otp_entry.pack()
            otp_submit_btn.config(state=NORMAL)
            otp_submit_btn.pack(pady=10)
        except Exception as e:
            update_status(f"❌ CAPTCHA error: {e}")
    threading.Thread(target=run).start()

@app.route('/set-otp', methods=['POST'])
def set_otp():
    data = request.json
    otp = data.get("otp")
    if otp:
        otp_var.set(otp)
        if otp_submit_btn['state'] == NORMAL:
            submit_otp()
        return jsonify({"status": "success", "message": "OTP set"})
    return jsonify({"status": "error", "message": "No OTP received"}), 400

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify(status_text)

@app.route('/check-download', methods=['GET'])
def check_download():
    if status_text["pdf_ready"]:
        return jsonify({"status": "ready", "message": "✅ PDF is ready to download."})
    else:
        return jsonify({"status": "not_ready", "message": "⏳ PDF is not ready yet."})

@app.route('/aadhaar-details', methods=['GET'])
def aadhaar_details():
    if status_text.get("qr_text"):
        return jsonify({"status": "success", "details": status_text["qr_text"]})
    else:
        return jsonify({"status": "error", "message": "QR data not available"}), 404

@app.route('/download-pdf', methods=['GET'])
def download_pdf():
    return send_from_directory('static', 'unlocked.pdf', as_attachment=True)



def run_flask():
    app.run(port=6969)

threading.Thread(target=run_flask, daemon=True).start()

# === GUI Start ===
load_page()
root.mainloop()
