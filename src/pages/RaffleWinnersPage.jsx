function RaffleWinnersPage({ raffleWinners }) {
  return (
    <section className="card raffle-history-card">
      <h2>Ganadores de los últimos sorteos</h2>
      <p className="admin-panel-subtitle">Resultados oficiales publicados por administración.</p>

      {raffleWinners.length === 0 ? (
        <p>Todavía no hay sorteos oficiales publicados.</p>
      ) : (
        <ul className="raffle-history-list">
          {raffleWinners.map((raffle) => (
            <li key={raffle.id} className="raffle-history-item">
              <p>
                <strong>Fecha:</strong> {raffle.drawDate}
              </p>
              <p>
                <strong>Artículo:</strong> {raffle.itemName}
              </p>
              <p>
                <strong>Ganador/a:</strong> {raffle.winnerName}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RaffleWinnersPage;
