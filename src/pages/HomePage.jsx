import { useEffect, useMemo, useState } from 'react';
import complejo from '../../imagendelcomplejo.jpg';

function HomePage({ onGoToBookings }) {
  const infoSlides = useMemo(
    () => [
      {
        title: '💰 Valor del turno: $58.800 (fijo)',
        description: '👉 Se divide entre todos los jugadores:',
        items: ['🟢 7 vs 7 = $4200 por persona', '🔵 6 vs 6 = $4900 por persona', 'Y así sucesivamente…']
      },
      {
        title: '📲 Reservas y confirmación',
        items: [
          'Reservas únicamente por WhatsApp, así queda todo registrado.',
          '📩 El mismo día del turno, entre las 10:00 y 12:00 hs, te enviamos un mensaje de confirmación.',
          '⚠️ Si no lo recibís, ¡por favor comunicate con nosotros!'
        ]
      },
      {
        title: '👤 Persona responsable del turno',
        description: 'El turno se guarda a nombre de una persona responsable, quien se encargará de:',
        items: ['✔️ Confirmar el turno', '✔️ Abonar el total', '✔️ Entregar las pecheras al finalizar']
      },
      {
        title: '¿Cómo se paga el turno?',
        items: [
          'El dueño del turno es quien junta el dinero del equipo.',
          'Efectivo: todos le pagan a una sola persona.',
          'Transferencia: todos transfieren a una misma cuenta, y esa cuenta es la única que transfiere a La Única Quequén.',
          '⚠️ Importante: para evitar confusiones, no se reciben pagos individuales.'
        ]
      }
    ],
    []
  );

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const carouselInterval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % infoSlides.length);
    }, 5000);

    return () => window.clearInterval(carouselInterval);
  }, [infoSlides.length]);

  const goToPrevSlide = () => {
    setActiveSlide((current) => (current - 1 + infoSlides.length) % infoSlides.length);
  };

  const goToNextSlide = () => {
    setActiveSlide((current) => (current + 1) % infoSlides.length);
  };

  return (
    <section className="card home-card">
      <div className="home-hero">
        <h2>⚽️ ¡Bienvenid@ a La Única Quequén! 🎉</h2>
        <p>
          Gracias por comunicarte con nosotros 🙌 Te dejamos toda la info importante para reservar tu turno.
        </p>
        <button type="button" className="home-book-btn" onClick={onGoToBookings}>
          Reservar turno
        </button>
      </div>

      <section className="info-carousel" aria-label="Información importante">
        <button type="button" className="carousel-arrow" aria-label="Ver información anterior" onClick={goToPrevSlide}>
          ‹
        </button>

        <div className="carousel-viewport">
          <div className="carousel-track" style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
            {infoSlides.map((slide) => (
              <article key={slide.title} className="info-block">
                <h3>{slide.title}</h3>
                {slide.description && <p>{slide.description}</p>}
                <ul>
                  {slide.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <button type="button" className="carousel-arrow" aria-label="Ver siguiente información" onClick={goToNextSlide}>
          ›
        </button>

        <div className="carousel-dots" role="tablist" aria-label="Secciones de información">
          {infoSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              role="tab"
              aria-label={`Ir a: ${slide.title}`}
              aria-selected={index === activeSlide}
              className={index === activeSlide ? 'carousel-dot carousel-dot-active' : 'carousel-dot'}
              onClick={() => setActiveSlide(index)}
            />
          ))}
        </div>
      </section>

      <p className="home-footer">¡Gracias por elegirnos y que disfruten del partido! 🥅🔥</p>

      <figure className="home-photo-block">
        <img src={complejo} alt="Cancha de fútbol de La Única Quequén" className="home-photo" />
        <figcaption>Viví la experiencia completa en nuestras canchas. ¡Te esperamos!</figcaption>
      </figure>
    </section>
  );
}

export default HomePage;
