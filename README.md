# RENotepad Web (modular)

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
- Temas Escuro / Claro / Branco
- Prévia Markdown (Ctrl+Shift+M) para arquivos `.md`
- Ao salvar, a barra mostra "Salvo em HH:MM DD/MM/AAAA"; opcionalmente
  insere a data/hora no fim do texto (Configurações)
- `.LOG` na primeira linha carimba data/hora ao abrir, como no original
