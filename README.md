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

## Licença
Adicione sua licença preferida (ex.: MIT) se desejar tornar o projeto público.

---
Se quiser, eu posso também:
- Gerar um README em inglês;
- Adicionar um `LICENSE` (MIT) automaticamente;
- Criar um pequeno script `serve.bat` para abrir o servidor local no Windows (cmd) com um clique.

Quer que eu adicione mais alguma seção ou gere o `serve.bat`?