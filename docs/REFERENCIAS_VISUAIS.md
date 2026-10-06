# Referências visuais

Galerias para consultar ao evoluir o site público e o portal Orquestra.cs. Usar como inspiração de composição, tipografia, interação e apresentação de produtos, mantendo a identidade própria da Orquestra.cs.

- [Framer Marketplace](https://www.framer.com/marketplace/templates/) — exemplos organizados por categoria.
- [Awwwards](https://www.awwwards.com/) — sites premiados e ideias visuais ousadas.
- [Land-book](https://land-book.com/) — landing pages e sites comerciais.
- [One Page Love](https://onepagelove.com/) — sites de uma página e páginas institucionais.
- [Godly](https://godly.website/) — referências modernas com animação e interação.
- [Webflow Showcase](https://webflow.com/made-in-webflow) — projetos publicados feitos no Webflow.

## Recent.design

- [Recent.design](https://recent.design/?ref=godly) — curadoria de referências de design, sites e produtos digitais.
- [Krea Agent landing page](https://recent.design/i/0ewrq4e-krea-agent-landing-page) — foco central com distorção gravitacional e partículas animadas; inspiração para a entrada no portal.
- [Liquid Glass Hero Section](https://recent.design/i/c6deg41-liquid-glass-hero-section) — formas fluidas em vidro que reagem ao cursor; usar com sutileza em detalhes da identidade, não como excesso de brilho.
- [AI Vision Motion Reel](https://recent.design/i/3mb1qo1-ai-vision-motion-reel) — movimento traduzido em camadas visuais; inspiração para demonstrar tecnologia e soluções em ação.

### Direção para o Portal Orquestra.cs

Manter o portal/altar como foco reconhecível e a mensagem comercial clara. Explorar uma distorção espacial suave na entrada, materiais líquidos ou vítreos discretos e movimento que sugira sistemas se conectando. Preservar a paleta azul da marca, luz controlada e hierarquia profissional; evitar neon excessivo, interface de jogo e animações que atrapalhem a leitura ou a navegação.

## Vídeo com IA: Runway

- [Camera Terms, Prompts & Examples](https://help.runwayml.com/hc/en-us/articles/46749315925395-Camera-Terms-Prompts-Examples) — biblioteca oficial da Runway sobre enquadramentos, ângulos, composição, movimentos de câmera e técnicas de foco, acompanhada por prompts e resultados em vídeo.

### Aplicação no Orquestrador

- `Medium shot` para apresentar o personagem sem perder os gestos das mãos.
- `Slow push in` para aproximar o Orquestrador quando ele revelar uma solução.
- `Slow pull back` para apresentar o ecossistema e as interfaces ao redor dele.
- `Controlled orbit` ou `arc` muito discreto para criar profundidade sem estética de jogo.
- `Rack focus` para transferir a atenção do personagem para um sistema, produto ou indicador.
- `Static camera` quando quisermos animar apenas mãos, cabeça, roupa e reflexos, mantendo consistência visual.
- Descrever no prompt o que aparece no início, o que se movimenta e o que é revelado no final da tomada.

Para a marca, priorizar câmera estável, movimentos lentos, enquadramento simétrico, espaço negativo e iluminação azul controlada. Evitar `crash zoom`, `whip pan`, tremores fortes e movimentos agressivos que aproximem o resultado de trailer ou jogo.

## Base técnica: Three.js

- [Manual completo do Three.js](https://threejs.org/manual/) — referência técnica para criar e otimizar a cena 3D do portal.
- [Instalação](https://threejs.org/manual/pages/installation.html) e [Criando uma cena](https://threejs.org/manual/pages/creating-a-scene.html) — configuração, câmera, cena e renderizador.
- [Carregando modelos 3D](https://threejs.org/manual/pages/loading-3d-models.html) — importar o altar/portal como modelo glTF ou GLB criado no Blender.
- [Materiais](https://threejs.org/manual/pages/materials.html), [Texturas](https://threejs.org/manual/pages/textures.html), [Luzes](https://threejs.org/manual/pages/lights.html) e [Sombras](https://threejs.org/manual/pages/shadows.html) — acabamento visual da cena.
- [Sistema de animação](https://threejs.org/manual/pages/animation-system.html) — movimento de câmera, luz e elementos da entrada.
- [Névoa](https://threejs.org/manual/pages/fog.html) e [Pós-processamento](https://threejs.org/manual/pages/how-to-use-post-processing.html) — atmosfera e acabamento, usados com moderação.
- [Design responsivo](https://threejs.org/manual/pages/responsive.html) — adaptar a composição para celular e desktop.
- [Renderização sob demanda](https://threejs.org/manual/pages/rendering-on-demand.html), [otimização](https://threejs.org/manual/pages/optimize-lots-of-objects.html) e [liberação de recursos](https://threejs.org/manual/pages/how-to-dispose-of-objects.html) — performance e ciclo de vida da cena.

### Aplicação prevista

Usar Three.js apenas na experiência visual de entrada/fundo. Manter textos, navegação, produtos, contatos e botões como HTML real, acessível e responsivo. Projetar a cena para ser leve, oferecer uma alternativa estática em dispositivos sem WebGL e respeitar a preferência por movimento reduzido.
