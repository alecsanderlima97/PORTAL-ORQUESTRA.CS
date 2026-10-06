# Laboratorio de movimento

A demonstracao fica isolada em `/laboratorio-motion`. Ela nao altera a pagina principal nem o fluxo atual do Portal Orquestra.cs.

## Arquivos

Criados:

- `src/app/laboratorio-motion/page.tsx`: rota e metadados `noindex`.
- `src/components/motion-lab/motion-lab.tsx`: estrutura das cenas e timeline GSAP.
- `src/components/motion-lab/motion-lab.module.css`: direcao visual, camadas e responsividade.
- `src/components/motion-lab/character-media.tsx`: midia reutilizavel em imagem ou video.
- `src/components/motion-lab/animation-config.ts`: configuracao central de intensidade.
- `public/orquestra-motion-conductor.png`: personagem transparente da demonstracao.

Modificados:

- `package.json` e `package-lock.json`: adicao de `gsap`.

## Trocar o personagem

Em `motion-lab.tsx`, altere o `src` do componente `CharacterMedia`:

```tsx
<CharacterMedia
  type="image"
  src="/sua-imagem-transparente.webp"
  alt="Descricao acessivel do personagem"
  priority
/>
```

O arquivo deve ficar em `public/`. Prefira PNG ou WebP transparente e mantenha margem suficiente ao redor da figura.

## Usar video Image-to-Video

O componente ja aceita MP4 ou WebM. Troque apenas as propriedades:

```tsx
<CharacterMedia
  type="video"
  src="/motion/personagem.webm"
  fallbackSrc="/orquestra-motion-conductor.png"
  alt="Figura abstrata conduzindo uma operacao digital"
/>
```

O video usa `autoplay`, `muted`, `playsInline`, `loop` e `preload="metadata"`. Se o carregamento falhar ou o visitante preferir movimento reduzido, a imagem de fallback aparece automaticamente.

## Animacoes

GSAP e ScrollTrigger controlam:

- entrada da marca, texto e personagem;
- fixacao da cena durante a rolagem;
- saida do Hero;
- escala e reposicionamento do personagem;
- entrada do painel, conectores e cards;
- parallax por profundidade;
- transicao para o CTA final;
- parallax sutil do mouse com `quickTo`.

CSS controla:

- flutuacao minima do personagem;
- particulas discretas;
- respiracao do grafico;
- indicador de rolagem;
- luz, grade, arquitetura, sombras e acabamento responsivo.

Framer Motion nao foi instalado. GSAP cobre a timeline e o scroll com mais controle neste experimento; adicionar outra biblioteca faria duas ferramentas disputarem o mesmo elemento e aumentaria o JavaScript sem ganho real.

## Ajustar intensidade

Edite `src/components/motion-lab/animation-config.ts`:

```ts
export const motionLabConfig = {
  parallax: true,
  mouseParallax: true,
  particles: true,
  characterFloating: true,
  scrollStorytelling: true,
  mouseTravel: 12,
  parallaxTravel: 56,
  floatingDistance: 8,
  scrollDistance: 3.6,
} as const;
```

- `mouseTravel`: deslocamento maximo provocado pelo ponteiro.
- `parallaxTravel`: distancia relativa das camadas na rolagem.
- `floatingDistance`: amplitude da flutuacao em pixels.
- `scrollDistance`: comprimento total da narrativa em alturas de tela.

Para mudar a velocidade de uma cena, ajuste `duration` e a posicao numerica no encadeamento da `timeline` em `motion-lab.tsx`.

## Adicionar uma cena

1. Crie o elemento dentro de `stage` com um seletor `data-motion` exclusivo.
2. Posicione e estilize o estado visual em `motion-lab.module.css`.
3. Adicione um `fromTo`, `to` ou `from` na timeline.
4. Informe a posicao inicial da cena no ultimo argumento do tween.
5. Valide desktop, tablet, mobile e movimento reduzido.

Exemplo:

```ts
timeline.fromTo(
  "[data-motion='nova-cena']",
  { autoAlpha: 0, y: 36 },
  { autoAlpha: 1, y: 0, duration: 16 },
  58,
);
```

## Performance e acessibilidade

- Movimento concentrado em `transform` e `opacity` para evitar recalculo de layout.
- Elementos animados usam dimensoes estaveis e `will-change` apenas onde necessario.
- Imagem entregue pelo `next/image`, com tamanhos responsivos.
- Video carrega apenas metadados antes da reproducao.
- Particulas sao deterministicas e nao recriadas durante a renderizacao.
- Efeitos sao simplificados nos breakpoints menores.
- `prefers-reduced-motion` remove a timeline, as particulas e os elementos decorativos animados.
- A rota esta com `noindex` enquanto for um laboratorio interno.
