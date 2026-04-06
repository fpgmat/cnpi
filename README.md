# CNPI Hub — Banco de Questões

Plataforma de estudos para o exame CNPI com banco de questões por assunto, modo quiz e geração de questões por IA (Gemini).

## Deploy — GitHub Pages + Subdomínio

### 1. Criar repositório no GitHub
```
Nome sugerido: cnpi-hub
Visibilidade: Public (necessário para GitHub Pages gratuito)
```

### 2. Subir os arquivos
```bash
git init
git add .
git commit -m "feat: CNPI Hub - banco de questões CAPM"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/cnpi-hub.git
git push -u origin main
```

### 3. Ativar GitHub Pages
- Vá em **Settings → Pages**
- Source: **Deploy from a branch**
- Branch: `main` / `/ (root)`
- Salvar

### 4. Configurar subdomínio `cnpi.flaviopascoal.shop`
- No campo **Custom domain**, digite: `cnpi.flaviopascoal.shop`
- Isso vai criar o arquivo `CNAME` automaticamente

### 5. Configurar DNS no seu provedor de domínio
Adicione um registro **CNAME**:
```
Tipo:  CNAME
Nome:  cnpi
Valor: SEU_USUARIO.github.io
TTL:   600 (ou automático)
```

### 6. Aguardar propagação (até 48h, normalmente minutos)
O GitHub vai provisionar HTTPS automaticamente via Let's Encrypt.

---

## Estrutura do Projeto

```
cnpi-questoes/
├── index.html          # App principal
├── style.css           # Design system dark mode
├── app.js              # Lógica: quiz, banco, IA
├── CNAME               # cnpi.flaviopascoal.shop
└── data/
    └── capm.json       # Banco de questões CAPM (10 questões)
```

## Adicionar Novos Assuntos

Basta criar um novo arquivo em `data/`:
```
data/capm.json          ✅ pronto
data/derivativos.json   ← próximo
data/renda-fixa.json
data/financas-corp.json
```

Formato do JSON:
```json
{
  "assunto": "Nome do Assunto",
  "questoes": [
    {
      "id": 1,
      "enunciado": "Texto da questão...",
      "opcoes": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
      "gabarito": "B",
      "explicacao": "Explicação detalhada..."
    }
  ]
}
```
