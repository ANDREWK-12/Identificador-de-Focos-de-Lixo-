# train.py

from ultralytics import YOLO

# --- Configurações ---
# Defina o caminho para o arquivo data.yaml do seu dataset

DATASET_CONFIG = 'E:/Aulas/projetos/Lixo.v3i.yolov8/data.yaml'

MODEL_BASE = 'yolov8n.pt'
EPOCHS = 50 
BATCH_SIZE = 4
PROJECT_NAME = 'identificador_lixo_cpu'

# --- Iniciar o Treinamento ---
model = YOLO(MODEL_BASE)

print(f"Iniciando treinamento via CPU. O processo pode levar um tempo considerável...")

results = model.train(
    data=DATASET_CONFIG, 
    epochs=EPOCHS,
    imgsz=640,
    batch=BATCH_SIZE,
    project='runs/detect',
    name=PROJECT_NAME,
    device='cpu'  
)

print(f"✅ Treinamento concluído! Modelo salvo em: runs/detect/{PROJECT_NAME}/weights/best.pt")