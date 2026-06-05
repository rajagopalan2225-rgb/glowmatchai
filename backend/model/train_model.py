import os
import json
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.preprocessing.image import ImageDataGenerator

def train():
    os.makedirs("backend/model", exist_ok=True)
    
    # Needs training_data/ folders
    data_dir = "training_data"
    img_size = (128, 128)
    batch_size = 32
    
    if not os.path.exists(data_dir):
        print(f"Error: {data_dir} directory not found.")
        return

    datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=10,
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

    # Automatically set output neurons based on classes found (Fair, Medium, Dusky, Dark)
    num_classes = len(train_gen.class_indices)

    # ── MobileNetV2 Transfer Learning Architecture ── #
    # This prepares the model for real-world face resilience
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(128, 128, 3),
        include_top=False,
        weights='imagenet'
    )
    base_model.trainable = False  # Freeze base layers first

    model = models.Sequential([
        # MobileNetV2 requires inputs in [-1, 1], but our ImageDataGenerator already scales to [0, 1].
        # We will adjust preprocessing in production predicting route.
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.4),
        layers.Dense(num_classes, activation='softmax')
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001), 
        loss='categorical_crossentropy', 
        metrics=['accuracy']
    )

    # Train
    print("Starting Transfer Learning on MobileNetV2...")
    history = model.fit(train_gen, validation_data=val_gen, epochs=5)

    # Save
    model.save("model/skin_tone_model.h5")
    
    # Save class index mapping
    indices = {v: k for k, v in train_gen.class_indices.items()}
    with open("model/class_indices.json", 'w') as f:
        json.dump(indices, f)
        
    print(f"Final validation accuracy: {history.history['val_accuracy'][-1]:.4f}")

if __name__ == "__main__":
    train()
