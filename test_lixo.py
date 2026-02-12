# test_lixo.py

from ultralytics import YOLO
import os

# -------------------------- CONFIGURAÇÕES --------------------------

# 1. LOCAL DO MODELO TREINADO
# Certifique-se de que o caminho aponta para o arquivo 'best.pt' do seu modelo treinado.
MODELO_TREINADO = 'runs/detect/identificador_lixo_cpu/weights/best.pt'

# 2. FONTE DE ENTRADA (IMAGENS/VÍDEOS)
# Defina o caminho para a imagem ou vídeo que você deseja testar.
FONTE_DE_TESTE = 'test_imagens/WhatsApp Video 2026-01-17 at 11.48.03.mp4' 
 
# 3. CONFIANÇA MÍNIMA (THRESHOLD)
# Define a confiança mínima para aceitar uma deteção (0.0 a 1.0).
CONFIANCA_MINIMA = 0.50


# 4. DISPOSITIVO
# Define o dispositivo para inferência ('cpu' ou 'cuda' para GPU).
DEVICE = 'cpu'

# -------------------------- FUNÇÃO DE INFERÊNCIA --------------------------

def executar_inferencia():
    """
    Carrega o modelo treinado e executa a deteção na fonte de teste definida.
    """
    try:
        # Carrega o modelo treinado (best.pt)
        print(f"✅ Carregando o modelo: {MODELO_TREINADO}...")
        model = YOLO(MODELO_TREINADO)
        
        # Cria a pasta de saída para os resultados se ela não existir
        output_dir = 'runs/predict/lixo_detectado'
        os.makedirs(output_dir, exist_ok=True)
        
        # Executa a deteção (inferência)
        print(f"🚀 Iniciando deteção na fonte: {FONTE_DE_TESTE}...")
        results = model.predict(
            source=FONTE_DE_TESTE,
            conf=CONFIANCA_MINIMA,   # Nível de confiança mínimo
            device=DEVICE,           # Dispositivo (CPU neste caso)
            save=True,               # Salva as imagens com as caixas
            project='runs/predict',  # Pasta principal para resultados
            name='lixo_detectado'    # Nome da subpasta de resultados
        )

        print("\n---------------------------------------------------------")
        print(f"✅ Deteção concluída! Resultados salvos em: {output_dir}")
        print("---------------------------------------------------------")

    except Exception as e:
        print(f"❌ Ocorreu um erro durante a inferência: {e}")
        print("Certifique-se de que o caminho do modelo e a fonte de teste estão corretos.")

# -------------------------- EXECUTAR --------------------------

if __name__ == '__main__':
    executar_inferencia()