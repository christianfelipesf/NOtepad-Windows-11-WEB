# RENotepad Web (modular)
https://christianfelipesf.github.io/NOtepad-Windows-11-WEB/

Réplica do [RENotepad](https://github.com/nikkoxgonzales/RENotepad) para o
navegador, com o visual do Bloco de notas do Windows 11. Escuro por padrão,
com temas Claro e Branco. Sem Copilot, sem telemetria.

Versão web não oficial, inspirada no projeto original de Nikko Gonzales.

## Abrir

É um site estático, sem build. Basta abrir `index.html` no navegador
(dois cliques funcionam — não usa módulos ES, então `file://` funciona).

Ou sirva a pasta: `python3 -m http.server` dentro dela e abra o endereço
mostrado.

## Estrutura

- `index.html` — estrutura e inclusão dos módulos
- `css/theme.css` — temas escuro/claro/branco
- `css/app.css` — layout, menus, diálogos, prévia Markdown
- `js/core.js` — utilidades, configurações, persistência de sessão
- `js/encoding.js` — detecção BOM/UTF-16/UTF-8/ANSI e quebras CRLF/LF/CR
- `js/markdown.js` — renderizador Markdown próprio (prévia de `.md`)
- `js/tabs.js` — guias, abrir/salvar/fechar
- `js/editor.js` — zoom, localizar/substituir, ir para, fonte, data/hora
- `js/ui.js` — menus, diálogos, barra de status, atalhos
- `js/main.js` — inicialização e restauração da sessão

## Recursos

- Guias persistentes: fechar o navegador com arquivos abertos restaura tudo
  (conteúdo, codificação e quebras) na próxima abertura
- Temas Escuro / Claro / Branco / Sépia / Meia-noite (barra de status ou Exibir → Tema)
- Prévia Markdown (Ctrl+Shift+M) para arquivos `.md`
- Ao salvar, a barra mostra "Salvo em HH:MM DD/MM/AAAA"; opcionalmente
  insere a data/hora no fim do texto (Configurações)
- `.LOG` na primeira linha carimba data/hora ao abrir, como no original
- Contador de linhas na barra de status; cada nota guarda criação/edição
  (passe o mouse na guia ou abra Arquivo → Propriedades da nota)
- Guias com arrastar-para-reordenar; com muitas guias, use ▾ para listar todas
- Arquivo → Gerenciar guias: selecionar, ordenar (A–Z/recentes) e baixar
  marcadas em `.zip` com `indice.csv` + `notas.json` (título, criação, edição);
  o mesmo `.zip` pode ser importado de volta (inclusive arrastando o arquivo)

## Instalar como app e identidade

- Ícone próprio em `icons/` (SVG + PNG 16–512, `.ico` e capa OG 1200x630)
- `site.webmanifest` + `sw.js`: dá para instalar como app (Arquivo →
  Instalar app…) e usar offline; o `theme-color` acompanha o tema
  Escuro/Claro/Branco
- Prévia de link (Open Graph + Twitter Card) com título, descrição e capa
- Abrindo por `file://` continua funcionando — só o modo offline exige
  `http(s)`
