import { useState } from 'react'
import './App.css'

function EntryTitle(props: {title: string}) {
  return (
    <h2 id="entry-title">{props.title}</h2>
  )
}

function ProgressText(props: {watched: number, total: number}) {
  return (
    <span>{props.watched} / {props.total}</span>
  )
}

function IncreaseButton(props: {
  onIncrease: () => void
  disabled: boolean
}) {
  return (
    <button disabled={props.disabled} onClick={props.onIncrease}>
      +
    </button>
  )
}

function DecreaseButton(props: {
  onDecrease: () => void
  disabled: boolean
}) {
  return (
    <button disabled={props.disabled} onClick={props.onDecrease}>
      -
    </button>
  )
}

function ProgressControl(props: {
  watched: number
  total: number
  onIncrease: () => void
  onDecrease: () => void
}) {
  return (
    <div className="progress-control">
      <DecreaseButton onDecrease={props.onDecrease} disabled={props.watched==0} />
      <ProgressText watched={props.watched} total={props.total} />
      <IncreaseButton onIncrease={props.onIncrease} disabled={props.watched==props.total} />
    </div>
  )
}

function App() {
  const [anime, setAnime] = useState({
    title: "Attack on Titan",
    watched: 2,
    total: 12
  })

function increaseProgress() {
  setAnime({
    ...anime,
    watched: anime.watched + 1
  })
}

function decreaseProgress() {
  setAnime({
    ...anime,
    watched: anime.watched - 1
  })
}

  function resetProgress() {
    setAnime({
      ...anime,
      watched: 0
    })
  }

  return (
    <main className="popup">
      <h1>AniPresence</h1>
      <section className="entry" aria-labelledby="entry-title">
        <EntryTitle title={anime.title} />
        <ProgressControl
          watched={anime.watched}
          total={anime.total}
          onIncrease={increaseProgress}
          onDecrease={decreaseProgress}
        />
        <p>Episodes remaining: {anime.total - anime.watched} </p>
        <button type="button" onClick={resetProgress}>
          Reset
        </button>
      </section>
    </main>
  )
}

export default App
