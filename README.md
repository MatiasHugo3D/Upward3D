# Gram3d

Cria uma aplicação web SaaS moderna com visual premium em Dark Mode (estilo Linear/Vercel), totalmente otimizada para telemóvel e desktop, chamada "PrintFlow 3D", em Português.



A app deve ter 3 abas principais na navegação:



1. Nova Impressão (Leitor por Print Screen + Calculadora Exata):

- Botão para carregar um print screen ou tirar foto ao ecrã do slicer (Anycubic Slicer, Bambu Studio, OrcaSlicer) ou app da impressora.

- Usa a biblioteca gratuita Tesseract.js no navegador para tentar ler automaticamente as gramas (g) e o tempo (horas/minutos) da imagem carregada.

- Campos editáveis: Nome da Peça, Seleção do Rolo de Filamento em stock, Peso (g), Horas, Minutos e Margem de Lucro (%).

- Calculadora 100% exata em tempo real: soma (Custo do Filamento) + (Eletricidade: horas * 0.15 kW * tarifa kWh configurável) + (Desgaste da máquina: horas * valor/hora configurável) + (Margem de Lucro %). Mostra Custo Real, Lucro Líquido e Preço Final de Venda.

- Botão "Iniciar Impressão e Descontar Stock" que abate as gramas do rolo escolhido.



2. Impressões & Falhas (Dashboard):

- Cartões superiores com: Stock Total (g), Receita Estimada, Taxa de Sucesso (%) e Desperdício por Falhas (g).

- Lista das impressões com estado ("A imprimir", "Concluída", "Falhou").

- Nas impressões "A imprimir", adiciona dois botões: "Concluída" e "Falhou (%)".

- Ao clicar em "Falhou (%)", abre um ecrã onde o utilizador pode carregar o print da app da impressora (lendo a % com Tesseract.js) ou arrastar uma barra de 1% a 99% indicando onde parou. A app devolve automaticamente o filamento não gasto ao stock do rolo e regista a perda.



3. Stock de Filamentos:

- Cartões visuais para cada rolo com barra de progresso, cor do filamento, marca/nome, gramas restantes (ex: 840g / 1000g) e preço pago.

- Botão "+ Adicionar Novo Rolo" e alerta visual quando um rolo tiver menos de 150g.

- Seletor de moeda no topo (EUR €, BRL R$, CHF) e modal de "Custos Base" para editar tarifa kWh e desgaste/hora.



Inclui dados iniciais realistas (como uma Anycubic Kobra S1 e 3 rolos de filamento) guardados no localStorage para testar imediatamente.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gram3d.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5f97af8f-e6c7-4d10-973f-daa3dd5121ed).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
