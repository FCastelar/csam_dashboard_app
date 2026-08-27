# CAF | Executive Account Dashboard

Dashboard executivo responsivo para várias contas, alimentado por arquivos Excel
lidos **diretamente no navegador**.

O site pode ser publicado publicamente porque ele não contém dados: cada pessoa
conecta a própria pasta (por exemplo, a pasta sincronizada do OneDrive) e o
processamento acontece na máquina dela.

## Como funciona

```text
GitHub Pages (público)  ->  apenas HTML/CSS/JS
                             |
                    navegador da pessoa
                             |  File System Access API (somente leitura)
                             v
             ...\OneDrive\...\Accounts\*.xlsx
                             |
                   parse com SheetJS -> dashboard em memória
```

Nenhum arquivo é enviado para servidor algum. O build de produção ainda aplica
`connect-src 'none'` via Content-Security-Policy, de modo que o próprio
navegador bloqueia qualquer tentativa de envio.

## Estrutura

- `src/services/parse-workbook.ts`: parser isomórfico (roda no navegador e no Node)
- `src/services/sources/`: origens de dados (pasta local e upload manual)
- `src/hooks/use-dashboard-source.ts`: orquestra origem, contas e atualização
- `src/components/ConnectScreen.tsx`: tela inicial de conexão
- `src/App.tsx`: dashboard
- `scripts/generate-dashboard-data.ts`: exportação opcional do JSON via linha de comando

## Onde colocar os Excels

Qualquer pasta local serve. Use o padrão de nome abaixo, pois ele define o rótulo
no seletor de contas:

```text
NomeDaConta_Account_Executive_View.xlsx
```

## Como usar

1. Abra o site publicado (ou rode localmente, veja abaixo).
2. Clique em **Escolher pasta** e selecione a pasta com os arquivos `.xlsx`.
3. Autorize a leitura quando o navegador pedir.

Nas próximas visitas basta um clique em **Reconectar pasta**: o navegador exige
um gesto do usuário para reabrir a permissão.

Ao salvar o Excel, o dashboard relê a pasta automaticamente (verificação a cada
10 segundos). O botão **Refresh** força a releitura na hora.

### Navegadores

| Recurso | Suporte |
| --- | --- |
| Conectar pasta e atualizar sozinho | Edge e Chrome no desktop |
| Upload manual dos arquivos | Todos os navegadores |

Sem a File System Access API o app cai automaticamente no modo de upload, que
exige selecionar os arquivos novamente a cada visita.

## Como executar localmente

1. Instale o Node.js LTS uma única vez.
2. Abra `Abrir-dashboard.cmd` com duplo clique.

O launcher instala as dependências na primeira execução e abre o navegador.

## Publicação no GitHub Pages

O workflow `.github/workflows/deploy.yml` publica a cada push na `main`. Em
**Settings > Pages**, defina *Source* como **GitHub Actions**.

O build de CI nunca precisa de arquivos Excel e falha caso encontre qualquer
planilha ou JSON de dados dentro de `dist/`.

> **Antes de tornar o repositório público:** o histórico do Git ainda contém
> planilhas e JSONs de contas reais commitados anteriormente. Tornar o
> repositório público sem limpar o histórico expõe esses dados. Use
> `git filter-repo` para removê-los ou publique a partir de um repositório novo,
> sem histórico.

## Scripts

- `npm run dev`: inicia o Vite
- `npm run build`: type check e build de produção (não usa Excel)
- `npm run preview`: serve o build de produção
- `npm run test`: executa os testes com Vitest
- `npm run generate-data`: exporta o JSON de uma conta para `generated/` (opcional)
- `npm run watch-data`: reprocessa o Excel a cada alteração e grava em `generated/` (opcional)
- `npm run dev:legacy`: Vite junto do watcher acima

## Observações de segurança

- Os dados são processados exclusivamente no navegador.
- O Excel nunca é enviado para serviços externos.
- `Accounts/`, `generated/` e `public/data/` são ignorados pelo Git.
- Apenas a referência da pasta escolhida é guardada (em IndexedDB), nunca o conteúdo.
- Use **Trocar origem** para desconectar a pasta, o que é recomendado em
  computadores compartilhados.
- Campos vazios são tratados com `Não informado` ou ocultos.
