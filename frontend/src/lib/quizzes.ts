export interface QuizOption {
  label: string;
  to: string; // archetype key this option points to
}
export interface QuizQuestion {
  q: string;
  options: QuizOption[];
}
export interface QuizResult {
  key: string;
  emoji: string;
  title: string;
  desc: string;
  color: string;
}
export interface Quiz {
  slug: string;
  title: string;
  subtitle: string;
  questions: QuizQuestion[];
  results: QuizResult[];
}

export const LISTENER_QUIZ: Quiz = {
  slug: 'oyente',
  title: '¿Qué tipo de oyente eres?',
  subtitle: '6 preguntas. Descubre tu arquetipo musical.',
  questions: [
    {
      q: 'Encuentras una canción que amas. ¿Qué haces?',
      options: [
        { label: 'La pongo en repeat 50 veces', to: 'looper' },
        { label: 'Escucho todo el álbum y al artista', to: 'coleccionista' },
        { label: 'La guardo y sigo descubriendo más', to: 'explorador' },
        { label: 'Me transporta a un recuerdo', to: 'nostalgico' },
      ],
    },
    {
      q: '¿Cuándo escuchas música con más intensidad?',
      options: [
        { label: 'En la mañana, con energía', to: 'explorador' },
        { label: 'Todo el día, en bucle', to: 'looper' },
        { label: 'De noche, a oscuras', to: 'nocturno' },
        { label: 'Cuando me pega la nostalgia', to: 'nostalgico' },
      ],
    },
    {
      q: 'Tu biblioteca se parece a…',
      options: [
        { label: 'Miles de canciones organizadas', to: 'coleccionista' },
        { label: 'Las mismas 20 en repeat', to: 'looper' },
        { label: 'Siempre cosas nuevas', to: 'explorador' },
        { label: 'Clásicos de toda la vida', to: 'nostalgico' },
      ],
    },
    {
      q: 'Sale un artista nuevo del que todos hablan…',
      options: [
        { label: 'Lo escucho completo el día 1', to: 'explorador' },
        { label: 'Investigo todo sobre él', to: 'coleccionista' },
        { label: 'Si pega, va directo a repeat', to: 'looper' },
        { label: 'Prefiero lo que ya conozco', to: 'nostalgico' },
      ],
    },
    {
      q: 'La playlist perfecta para ti es…',
      options: [
        { label: 'Para la madrugada, lenta y profunda', to: 'nocturno' },
        { label: 'Una sola canción en loop', to: 'looper' },
        { label: 'Novedades de esta semana', to: 'explorador' },
        { label: 'Tus hits de hace años', to: 'nostalgico' },
      ],
    },
    {
      q: 'Para ti, la música es…',
      options: [
        { label: 'Identidad y colección', to: 'coleccionista' },
        { label: 'Un ritual diario', to: 'looper' },
        { label: 'Refugio nocturno', to: 'nocturno' },
        { label: 'Una máquina del tiempo', to: 'nostalgico' },
      ],
    },
  ],
  results: [
    { key: 'looper', emoji: '🔁', title: 'El Looper', color: '#1db954', desc: 'Cuando una canción te atrapa, la quemas sin piedad. La repetición es tu superpoder: encuentras universos enteros dentro de un mismo tema.' },
    { key: 'explorador', emoji: '🧭', title: 'El Explorador', color: '#38bdf8', desc: 'Tu sed de descubrir no tiene fin. Mientras otros repiten, tú ya estás tres artistas más adelante. Tu biblioteca es un mapa en expansión.' },
    { key: 'nocturno', emoji: '🌙', title: 'El Nocturno', color: '#7c5cff', desc: 'Tu mejor música suena cuando el mundo duerme. La noche le da otro peso a cada canción — más honda, más tuya.' },
    { key: 'coleccionista', emoji: '📦', title: 'El Coleccionista', color: '#fbbf24', desc: 'No solo escuchas: curas, organizas y atesoras. Cada artista es una rama de un árbol enorme que solo tú entiendes.' },
    { key: 'nostalgico', emoji: '🕰️', title: 'El Nostálgico', color: '#ff5d8f', desc: 'La música es tu máquina del tiempo. Una intro basta para devolverte a un verano, una persona, una época entera.' },
  ],
};

export const GAMER_QUIZ: Quiz = {
  slug: 'jugador',
  title: '¿Qué tipo de jugador eres?',
  subtitle: '6 preguntas. Descubre tu clase gamer.',
  questions: [
    {
      q: 'Compras un juego nuevo. ¿Qué pasa?',
      options: [
        { label: 'Lo termino al 100% antes de tocar otro', to: 'completista' },
        { label: 'Se suma a mi backlog de 200 juegos', to: 'coleccionista' },
        { label: 'Lo juego solo online/competitivo', to: 'competitivo' },
        { label: 'Lo pruebo un rato y veo qué tal', to: 'casual' },
      ],
    },
    {
      q: 'Tu biblioteca de Steam es…',
      options: [
        { label: 'Pocos juegos, todos platinados', to: 'completista' },
        { label: 'Cientos sin abrir (pero algún día…)', to: 'coleccionista' },
        { label: '2-3 juegos con miles de horas', to: 'competitivo' },
        { label: 'Variada, según el mood', to: 'explorador' },
      ],
    },
    {
      q: 'Una oferta gigante en Steam…',
      options: [
        { label: 'Compro 1 y lo termino', to: 'completista' },
        { label: 'Compro 15 “por si acaso”', to: 'coleccionista' },
        { label: 'No me distrae de mi main', to: 'competitivo' },
        { label: 'Pruebo géneros nuevos', to: 'explorador' },
      ],
    },
    {
      q: '¿Qué te da más satisfacción?',
      options: [
        { label: 'Ver 100% completado', to: 'completista' },
        { label: 'Subir de rango / ganar', to: 'competitivo' },
        { label: 'Descubrir un juego raro increíble', to: 'explorador' },
        { label: 'Relajarme un rato sin presión', to: 'casual' },
      ],
    },
    {
      q: 'Tu tiempo de juego ideal…',
      options: [
        { label: 'Sesiones largas para avanzar la historia', to: 'completista' },
        { label: 'Ranked hasta tarde', to: 'competitivo' },
        { label: 'Saltar entre varios juegos', to: 'explorador' },
        { label: 'Una partidita cuando puedo', to: 'casual' },
      ],
    },
    {
      q: 'Tu backlog de juegos sin jugar…',
      options: [
        { label: 'No tengo, lo juego todo', to: 'completista' },
        { label: 'Es un monumento a mis buenas intenciones', to: 'coleccionista' },
        { label: '¿Backlog? Solo juego lo mío', to: 'competitivo' },
        { label: 'Existe pero no me estresa', to: 'casual' },
      ],
    },
  ],
  results: [
    { key: 'completista', emoji: '🏁', title: 'El Completista', color: '#1db954', desc: 'No descansas hasta ver el 100%. Cada logro, cada final, cada secreto: tuyo. Terminas lo que empiezas, sin excepción.' },
    { key: 'coleccionista', emoji: '📦', title: 'El Coleccionista', color: '#fbbf24', desc: 'Tu backlog es legendario. Compras más rápido de lo que juegas, pero cada juego es una promesa. Tu biblioteca vale una fortuna (emocional).' },
    { key: 'competitivo', emoji: '⚔️', title: 'El Competitivo', color: '#ff5d8f', desc: 'Pocas franquicias, miles de horas. La maestría es lo tuyo: prefieres dominar un juego antes que probar diez.' },
    { key: 'explorador', emoji: '🗺️', title: 'El Explorador', color: '#38bdf8', desc: 'Saltas entre géneros buscando esa joya escondida. Para ti cada juego nuevo es un mundo por descubrir.' },
    { key: 'casual', emoji: '🛋️', title: 'El Casual', color: '#7c5cff', desc: 'Juegas para disfrutar, sin presión ni rankings. El gaming es tu rato de paz — y eso también es ganar.' },
  ],
};

export const QUIZZES: Record<string, Quiz> = {
  oyente: LISTENER_QUIZ,
  jugador: GAMER_QUIZ,
};
