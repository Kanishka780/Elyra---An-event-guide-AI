import qrcode
import os

def generate_demo_qr():
    # Content for the QR code
    data = "http://localhost:5173/attendee-join"
    
    # Create QR code object
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    # Create an image from the QR Code instance
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Save to public folder
    public_path = "../frontend/public/event-qr.png"
    img.save(public_path)
    print(f"QR code saved to {os.path.abspath(public_path)}")

if __name__ == "__main__":
    generate_demo_qr()
