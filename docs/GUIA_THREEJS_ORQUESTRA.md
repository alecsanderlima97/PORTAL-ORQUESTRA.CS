# Guia Three.js para a Orquestra.cs

Este guia traduz o manual oficial do Three.js para decisões práticas no Portal Orquestra.cs. A proposta não é transformar o site em jogo: Three.js deve sustentar uma cena de marca controlada, enquanto o portal continua sendo um site comercial claro e acessível.

## Fluxo criativo aprovado

1. Usar o Figma para definir composição, medidas, hierarquia, cores e versões desktop/mobile com precisão.
2. Usar o Blender para construir e renderizar o portal/cenário como asset separado da interface.
3. Criar uma animação curta e controlada para a entrada; manter o logo, textos e botões fora da imagem para continuarem nítidos e editáveis.
4. Usar IA para explorar conceitos visuais, não como fonte final de tipografia, alinhamento ou posicionamento preciso.
5. Só levar o movimento para Rive ou Three.js se a interação no próprio site trouxer valor claro; a primeira entrega pode usar a arte renderizada pelo Blender.

## O que Three.js pode fazer aqui

- Montar uma cena com câmera, renderizador e objetos 3D.
- Importar um modelo GLB/GLTF do portal ou altar, preparado no Blender.
- Controlar materiais, texturas, luz, sombra, cor e névoa para dar profundidade.
- Animar câmera e luz na entrada, com transição curta e intencional.
- Aplicar pós-processamento com parcimônia para acabamento, sem depender de brilho intenso.

## Arquitetura visual recomendada

1. Criar um canvas Three.js como camada de fundo, separado da interface.
2. Usar uma cena própria com câmera e renderizador responsivos.
3. Manter logo, títulos, navegação, cards, contatos e botões em HTML/CSS. Isso preserva nitidez, acessibilidade, SEO e layout responsivo.
4. Preparar o portal como GLB/GLTF quando for necessário controlar posição, luz, câmera e profundidade independentemente. O manual recomenda glTF para entrega em tempo real por ser adequado à transmissão e renderização.
5. Alinhar a cor de fundo à névoa para que os objetos distantes desapareçam naturalmente, sem uma linha de horizonte visível.

## Movimento sem estética de jogo

- Estado inicial: portal central, composição calma, luz azul discreta e movimento ambiente quase imperceptível.
- Entrada: após ativação explícita do botão HTML, mover a câmera e elevar a luz por uma transição breve; depois revelar a interface do portal.
- Interior: reduzir ou parar a animação quando ela já não acrescentar informação.
- Respeitar `prefers-reduced-motion`; oferecer uma transição curta ou nenhuma animação para quem preferir movimento reduzido.
- Não usar controles de jogo, mira, HUD, partículas excessivas, tremores ou efeitos de combate.

## Desempenho e compatibilidade

- Carregar a cena sob demanda e renderizar continuamente apenas enquanto houver animação real. O manual alerta que um loop permanente consome recursos e bateria quando nada muda.
- Limitar geometria, texturas, luzes e passes de pós-processamento; testar em aparelhos móveis reais.
- Redimensionar renderizador e câmera usando as dimensões do canvas, sem distorcer o modelo.
- Liberar geometrias, materiais e texturas que deixarem de ser usadas; o Three.js não descarta automaticamente todos esses recursos.
- Fornecer fundo estático leve se WebGL não estiver disponível ou falhar.
- Não escolher WebGPU, WebXR, física ou workers para a primeira versão; só avaliar se uma necessidade real justificar a complexidade.

## Sequência de estudo e implementação

1. Instalação, fundamentos e criação de cena.
2. Câmeras, materiais, texturas, luzes, sombras e gestão de cor.
3. Importação de GLB/GLTF e validação do modelo no navegador.
4. Animação de câmera/luz e transição acionada pelo botão de entrada.
5. Névoa e, se necessário, um único efeito leve de pós-processamento.
6. Responsividade, renderização sob demanda, fallback, limpeza de recursos e otimização.
7. Revisão visual por screenshots em desktop e mobile, além de teste de teclado, contraste, movimento reduzido e funcionamento sem WebGL.

## Referências oficiais consultadas

- [Fundamentos](https://threejs.org/manual/en/fundamentals.html)
- [Criando uma cena](https://threejs.org/manual/en/creating-a-scene.html)
- [Criando texto](https://threejs.org/manual/en/creating-text.html)
- [Materiais](https://threejs.org/manual/en/materials.html)
- [Luzes](https://threejs.org/manual/en/lights.html)
- [Gestão de cores](https://threejs.org/manual/en/color-management.html)
- [Carregando modelos 3D](https://threejs.org/manual/en/loading-3d-models.html)
- [Névoa](https://threejs.org/manual/en/fog.html)
- [Animação](https://threejs.org/manual/en/animation-system.html)
- [Responsividade](https://threejs.org/manual/en/responsive.html)
- [Pós-processamento](https://threejs.org/manual/en/how-to-use-post-processing.html)
- [Renderização sob demanda](https://threejs.org/manual/en/rendering-on-demand.html)
- [Otimização](https://threejs.org/manual/en/optimize-lots-of-objects.html)
- [Limpeza de recursos](https://threejs.org/manual/en/cleanup.html)
