from ultralytics import YOLO

# Carrega seu modelo
model = YOLO(r'runs\detect\identificador_lixo_cpu\weights\best.pt')

# Exporta para ONNX (Open Neural Network Exchange)
model.export(format='onnx')