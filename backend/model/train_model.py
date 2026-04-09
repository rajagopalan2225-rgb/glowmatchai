import os
import json
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.preprocessing.image import ImageDataGenerator

def train():
    os.makedirs("backend/model", exist_ok=True)
    
    # Needs training_data/{Fair, Medium, Dark} folders
    data_dir = "training_data"
    img_size = (128, 128)
    batch_size = 32
    
    if not os.path.exists(data_dir):
        print(f"Error: {data_dir} directory not found.")
        return

    datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        zoom_range=0.2,
        horizontal_flip=True,
        validation_split=0.2
    )

    train_gen = datagen.flow_from_directory(
        data_dir,
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        subset='training'
    )

    val_gen = datagen.flow_from_directory(
        data_dir,
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        subset='validation'
    )

    # CNN architecture
    model = models.Sequential([
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=(128, 128, 3)),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(128, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Flatten(),
        layers.Dense(256, activation='relu'),
        layers.Dropout(0.5),
        layers.Dense(3, activation='softmax')
    ])

    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])

    # Train
    print("Starting training...")
    history = model.fit(train_gen, validation_data=val_gen, epochs=25)

    # Save
    model.save("backend/model/skin_tone_model.h5")
    
    # Save class index mapping
    indices = {v: k for k, v in train_gen.class_indices.items()}
    with open("backend/model/class_indices.json", 'w') as f:
        json.dump(indices, f)
        
    print(f"Final training accuracy: {history.history['accuracy'][-1]:.4f}")
    print(f"Final validation accuracy: {history.history['val_accuracy'][-1]:.4f}")

if __name__ == "__main__":
    # train()
    pass
