import os
import numpy as np
from PIL import Image

def generate_noise_image(base_color, variance=15, size=(128, 128)):
    noise = np.random.normal(0, variance, (size[0], size[1], 3))
    img = np.ones((size[0], size[1], 3)) * base_color
    noisy_img = np.clip(img + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(noisy_img)

def main():
    tones = {
        "Fair": [220, 185, 165],
        "Medium": [180, 130, 90],
        "Dusky": [150, 100, 70],
        "Dark": [90, 55, 40]
    }
    
    base_dir = "training_data"
    os.makedirs(base_dir, exist_ok=True)
    
    print("Generating training data (500 per tone)...")
    for tone, color in tones.items():
        tone_dir = os.path.join(base_dir, tone)
        os.makedirs(tone_dir, exist_ok=True)
        for i in range(500):
            random_shift = np.random.randint(-20, 20, size=3)
            img_color = np.clip(np.array(color) + random_shift, 0, 255)
            img = generate_noise_image(img_color, variance=12)
            img.save(os.path.join(tone_dir, f"{tone}_{i:03d}.jpg"))
    print("Training data generated in 'training_data/'")

if __name__ == "__main__":
    main()
