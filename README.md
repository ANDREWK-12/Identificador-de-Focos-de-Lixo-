## Identificador de Lixo (YOLOv8)

Projeto para detecção de lixo usando Ultralytics YOLOv8. Este repositório contém scripts para treinar, inferir e exportar o modelo (ONNX), além da configuração do dataset (`data.yaml`).

### Conteúdo principal

- `train.py` - Script para treinar o modelo YOLOv8 (usa `ultralytics.YOLO`).
- `test_lixo.py` - Script para executar inferência em imagem/vídeo com o modelo treinado.
- `export.py` - Script simples para exportar o `best.pt` para ONNX.
- `data.yaml` - Configuração do dataset (caminhos, classes, nc, etc.).
- `yolov8n.pt` - Checkpoint base (modelo pré-treinado) usado como `MODEL_BASE`.
- `runs/` - Pasta onde o Ultralytics salva os resultados de treino e inferência.

## Visão geral

O fluxo típico é:

1. Preparar o dataset no formato YOLO (pastas `train/images`, `train/labels`, `valid/images`, `valid/labels`, `test/images`).
2. Ajustar `data.yaml` com o caminho absoluto do projeto e classes.
3. Treinar usando `train.py`.
4. Rodar inferência com `test_lixo.py` apontando para o `best.pt` gerado.
5. Opcional: exportar para ONNX com `export.py`.

## Pré-requisitos

- Python 3.8+ (recomendado 3.8 — 3.11)
- pip
- Dependências Python (instalar com pip):

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -U pip
pip install ultralytics opencv-python numpy pillow
# Para usar GPU, instale o PyTorch com suporte CUDA adequado ao seu driver/hardware
# (veja https://pytorch.org/get-started/locally/ para o comando correto).
```

Observação: o pacote `ultralytics` gerencia internamente o infer e treino com o framework YOLOv8.

## Configuração do dataset

Verifique `data.yaml` (já presente no repositório). Pontos importantes:

- `path`: caminho absoluto até a raiz do dataset (no projeto atual está: `E:\Aulas\projetos\Lixo.v3i.yolov8`).
- `train`, `val`, `test`: caminhos relativos a `path` para imagens de treino/val/test.
- `nc`: número de classes (no arquivo atual: 2).
- `names`: lista com os nomes das classes.

As labels devem estar no formato YOLO (x_center y_center width height, normalizados) em arquivos `.txt` com mesmo nome das imagens.

## Treinamento

Por padrão, `train.py` usa:

- `MODEL_BASE = 'yolov8n.pt'`
- `EPOCHS = 50`
- `BATCH_SIZE = 4`
- `device='cpu'` (altere para `'cuda'` se tiver GPU configurada)

Para treinar com as configurações atuais, ative o venv e rode (no cmd do Windows):

```bash
python train.py
```

Se quiser usar GPU, edite `train.py` e altere `device='cpu'` para `device='cuda'` (ou passe o índice, ex: `'cuda:0'`) e garanta que o PyTorch com CUDA esteja instalado.

Os resultados do treino serão salvos em `runs/detect/identificador_lixo_cpu/` (nome definido em `train.py`). O melhor peso fica em `weights/best.pt` dentro dessa pasta.

## Inferência (teste)

O script `test_lixo.py` realiza a inferência usando o arquivo de pesos (`best.pt`).

Antes de rodar, edite `test_lixo.py` se necessário para apontar para o modelo treinado e para a fonte de teste:

- `MODELO_TREINADO` — caminho para `best.pt` (padrão: `runs/detect/identificador_lixo_cpu/weights/best.pt`).
- `FONTE_DE_TESTE` — caminho para imagem ou vídeo (ex: `test_imagens/minha_foto.jpg` ou vídeo `.mp4`).
- `CONFIANCA_MINIMA` — limiar de confiança (0.0 a 1.0).
- `DEVICE` — `'cpu'` ou `'cuda'`.

Executar (no cmd):

```bash
python test_lixo.py
```

Saída: imagens/vídeos com boxes serão salvos em `runs/predict/lixo_detectado/` (ou subpastas geradas pelo Ultralytics).

## Exportar para ONNX

Para exportar o `best.pt` para ONNX, use o `export.py`. Garanta que a variável no script aponte para o `best.pt` correto.

```bash
python export.py
```

O ONNX gerado será salvo no mesmo diretório (o `ultralytics` coloca o arquivo exportado na pasta padrão do modelo).

## Dicas e troubleshooting

- Verifique caminhos absolutos no `data.yaml`. Erros comuns no treino são paths incorretos.
- Se o treinamento estiver muito lento no CPU, considere treinar em GPU ou usar menos epochs/batch size menores.
- Para problemas com dependências (ex: PyTorch/CUDA), siga as instruções oficiais do PyTorch para combinar versão CUDA e drivers.
- Se o `best.pt` não existir após o treino, verifique os logs em `runs/detect/<nome>/train.log` ou na saída do script para entender se houve erro.







# EcoMonitor IA — Identificador de Focos de Lixo

Projeto front-end leve para detectar, mapear e monitorar focos de lixo usando uma pipeline cliente (captura de foto → IA local → armazenamento local). Ideal para demonstrações, provas de conceito e pequenas aplicações locais.

> Idioma: Português (pt-BR)

## Visão geral
EcoMonitor IA é uma aplicação estática (HTML/CSS/JS) que permite:
- Registrar denúncias com foto e localização (marca no mapa).
- Analisar imagens com um modelo ONNX em browser (ex.: yolov8 convertido) para detectar foco de lixo e exibir confiança.
- Gerar thumbnails otimizadas e manter os registros no localStorage (sem backend).
- Visualizar um feed estilo "Instagram" na tela principal com expansão inline da foto.
- Gerar relatórios com mapa, gráfico por bairro e tabela detalhada de denúncias.
- Reverse-geocoding (Nominatim/OpenStreetMap) com cache local para preencher o campo `bairro` automaticamente.

Este repositório contém a UI e a lógica para captura, análise e relatório — tudo executado no cliente.

## Tecnologias utilizadas
- HTML / CSS / JavaScript (vanilla)
- Leaflet (mapas)
- Chart.js (gráficos)
- ONNX Runtime Web (execução do modelo ONNX no navegador)
- APIs públicas: Nominatim (reverse geocoding)

Arquivos principais:
- `index.html` — painel principal / feed
- `relatorios.html` — relatórios (mapa, gráfico, tabela)
- `denuncia.html` — enviar nova denúncia (captura de foto + mapa)
- `dashboard.js`, `relatorios.js`, `denuncia.js`, `auth.js` — scripts da aplicação
- `style.css` — estilos

## Estrutura de pastas (resumida)
```
projetos 2/
  index.html
  relatorios.html
  denuncia.html
  dashboard.js
  relatorios.js
  denuncia.js
  auth.js
  style.css
  yolov8n.pt (exemplo / referência local)
  runs/ (resultados de execução/treino gerados localmente)
  test_imagens/ (imagens de exemplo)
```

> Nota: O projeto foi desenvolvido para rodar diretamente como arquivos estáticos, mas por segurança e compatibilidade com `fetch`/`module` recomenda-se servir por um servidor HTTP local (ver seção abaixo).

## Como rodar localmente (Windows - cmd.exe)
É recomendado abrir um servidor HTTP simples a partir da pasta `projetos 2` antes de abrir as páginas no navegador.

1. Abra o Prompt do Windows (cmd.exe).
2. Navegue até a pasta do projeto:

```cmd
cd /d "e:\Aulas\projetos\projetos 2"
```

3. Inicie um servidor simples (opções):

- Se tiver Python instalado (recomendado):

```cmd
python -m http.server 8000
```

- Ou usando `npx` (Node.js instalado):

```cmd
npx http-server -p 8000
```

4. Abra no navegador:

```
http://localhost:8000/index.html
http://localhost:8000/relatorios.html
http://localhost:8000/denuncia.html
```

## Uso rápido
- Nova denúncia (`denuncia.html`): tire/seleciona uma foto, marque o ponto no mapa, clique em "Analisar com IA". A página cria uma miniatura, executa a inferência e salva a denúncia em `localStorage` com os atributos principais.
- Painel (`index.html`): exibe feed com cartas (cards) de denuncias não resolvidas. Clique na imagem para expandir, marque como resolvido inline.
- Relatórios (`relatorios.html`): mostra mapa com focos do período selecionado, gráfico por bairro e tabela com registros.

## Modelo de dados (localStorage)
As denúncias são armazenadas em `localStorage` na chave `denuncias` como um array de objetos. Exemplo simplificado de um item:

```json
{
  "id": 1680000000000,
  "lat": -1.4090,
  "lon": -48.4350,
  "bairro": "Nome do Bairro",
  "confianca": "87.5",
  "horario": "2025-12-11T16:45:25.000Z",
  "thumb": "data:image/jpeg;base64,...",
  "reporter": "Seu Nome",
  "resolved": false
}
```

Além disso existe uma chave `geocode_cache` para guardar resultados de reverse-geocoding com TTL (padrão 14 dias).

## Considerações e limitações
- Reverse-geocoding:
  - O projeto usa o serviço público Nominatim — observar limites de uso e rate-limits. Para produção, recomendo um serviço com chave/API própria.
  - Há cache local (localStorage) com TTL para reduzir consultas.
- Armazenamento:
  - O uso de `localStorage` para imagens (dataURLs) pode encher o armazenamento do navegador quando houver muitas miniaturas. Para produção, armazene imagens em servidor / cloud storage e salve apenas URLs.
- Segurança:
  - Autenticação é client-side simples (nome guardado no localStorage) — não é segura para produção.
- Modelo IA:
  - O projeto espera um modelo ONNX compatível carregado localmente ou via URL. Ajustes podem ser necessários dependendo do modelo real (entrada/shape/preprocess).

## Boas práticas e próximos passos sugeridos
- Mover armazenamento para um backend (API) e armazenar imagens em bucket (S3, Azure Blob etc.).
- Proteger endpoints e adicionar autenticação real com tokens.
- Adicionar paginação/filtragem no relatório para muitos registros.
- Substituir Nominatim por serviço pago/privado para melhor confiabilidade.
- Fornecer compressão adicional (server-side) ou armazenamento em IndexedDB para lidar com muitas imagens.

## Customizações rápidas
- Mudar a área inicial do mapa: editar `dashboard.js` e `relatorios.js` em L.map(...).setView([lat, lon], zoom).
- Alterar TTL do cache: procurar por `geocode_cache_ttl` ou parâmetro semelhante no código (ex.: 14 dias) e ajustar.
- Trocar texto do cabeçalho / subtítulo: editar `index.html`, `relatorios.html`, `denuncia.html`.

## Troubleshooting
- Se o mapa não carregar: verifique conexão com a internet (tiles OpenStreetMap) e se o servidor HTTP local está ativo.
- Se as chamadas de geocodificação falharem: verifique CORS e rate limits; se estiverem bloqueadas, use um proxied server ou serviço com chave.

## Contribuindo
Pull requests são bem-vindos para melhorar UX, performance e arquitetura (mover para backend, melhorar armazenamento). Abra issues para bugs e solicitações de features.





