import { useState, Dispatch, SetStateAction, useEffect, useRef } from "react"
import Plot from "react-plotly.js"
import { ReactMic, ReactMicStopEvent } from "react-mic"

import styles from "./App.module.css"

type signal = { data: Array<number>; offset: number }

const Mic = ({ set }: { set: (signal: signal) => void }) => {
  const [playing, setPlaying] = useState(false)

  const handleInfo = async (e: ReactMicStopEvent) => {
    const a = await e.blob.arrayBuffer()
    console.log(e)
    const b = new Uint8Array(a)

    const signal = { data: Array.from(b), offset: 0 }
    console.log(signal)
    set(signal)
  }

  return (
    <>
      <h2>Add new signal</h2>
      <ReactMic
        record={playing}
        onStop={handleInfo}
        strokeColor="#dddddd"
        backgroundColor="#125d98"
      />
      <button
        onClick={() =>
          setPlaying(playing => {
            if (playing) return false
            setTimeout(() => {
              setTimeout(() => setPlaying(false), 400)
              setPlaying(true)
            }, 500)

            return false
          })
        }
        type="button"
      >
        {playing ? "Playing..." : "Play"}
      </button>
    </>
  )
}

type SignalProps = {
  title?: string
  signal: signal
  setSignal?: Dispatch<SetStateAction<signal>>
}
const Signal = ({ title, signal, setSignal }: SignalProps) => {
  const [adding, setAdding] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (input.current) {
      input.current.value = ""
    }
  }, [adding])

  const x = signal.data.map((_, i) => i - signal.offset)
  const y = signal.data
  const zeros = new Array(x.length).fill(0)

  return (
    <div className={styles.signal}>
      <h3>{title ? title : "Signal"}:</h3>
      {signal.data.length < 100 && (
        <div className={styles.tableValue}>
          <table>
            <tbody>
              <tr>
                <th>index</th>
                {signal.data.map((_, i) => (
                  <td
                    onClick={() => setSignal && setSignal({ data: signal.data, offset: i })}
                    key={i}
                  >
                    {i - signal.offset}
                  </td>
                ))}

                {setSignal && <td>{signal.data.length - signal.offset}</td>}
              </tr>

              <tr>
                <th>value</th>
                {signal.data.map((value, i) => (
                  <td
                    onClick={() => {
                      const data = [...signal.data]
                      data.splice(i, 1)
                      setSignal && setSignal({ data, offset: signal.offset })
                    }}
                    key={i}
                  >
                    {parseFloat(value.toString()).toFixed(2)}
                  </td>
                ))}
                {setSignal && (
                  <td>
                    {adding ? (
                      <input
                        ref={input}
                        onKeyDown={({ code }) => {
                          if (code !== "Enter") return
                          setSignal(({ data, offset }) => {
                            const newData = [...data]
                            if (input.current) newData.push(+input.current.value)
                            setAdding(false)
                            return { data: newData, offset }
                          })
                        }}
                      />
                    ) : (
                      <span onClick={() => setAdding(true)}>+</span>
                    )}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <div>
        <Plot
          data={[
            {
              x,
              y,
              type: "scatter",
              marker: {
                symbol: "circle",
                size: 4,
              },
              line: { width: 0 },
              hoverinfo: "y",
              error_y: {
                type: "data",
                symmetric: false,
                array: zeros,
                arrayminus: y,
                width: 0,
              },
            },
          ]}
          layout={{
            plot_bgcolor: "rgba(0, 0, 0, 0)",
            paper_bgcolor: "rgba(0, 0, 0, 0)",
            width: 320,
            height: 240,
            title: title ?? "Signal",
          }}
        />
      </div>
    </div>
  )
}

type ConvolutionProps = {
  signal1: signal
  signal2: signal
}

const get = (signal: signal, index: number) => {
  const min = -signal.offset
  const max = signal.data.length - signal.offset

  if (index < min || index >= max) {
    return 0
  }

  return signal.data[index + signal.offset]
}

const Sum = ({ signal1, signal2 }: ConvolutionProps) => {
  const min = Math.min(-signal1.offset, -signal2.offset)
  const max = Math.max(signal1.data.length - signal1.offset, signal2.data.length - signal2.offset)

  const data = []
  for (let i = min; i < max; ++i) {
    data.push(get(signal1, i) + get(signal2, i))
  }

  return (
    <>
      <Signal title="Sum" signal={{ data, offset: -min }} />
    </>
  )
}

const Rest = ({ signal1, signal2 }: ConvolutionProps) => {
  const min = Math.min(-signal1.offset, -signal2.offset)
  const max = Math.max(signal1.data.length - signal1.offset, signal2.data.length - signal2.offset)

  const data = []
  for (let i = min; i < max; ++i) {
    data.push(get(signal1, i) - get(signal2, i))
  }

  return (
    <>
      <Signal title="Rest (S1 - S2)" signal={{ data, offset: -min }} />
    </>
  )
}

const AmpliationAtenuation = ({ inputSignal }: { inputSignal: signal }) => {
  const [constant, setConstant] = useState(2)

  const newData = inputSignal.data.map(x => x * constant)

  return (
    <>
      <input
        className={styles.inputConstant}
        step={0.01}
        onChange={e => setConstant(+e.target.value)}
        type="number"
        value={constant}
      />
      <Signal
        title={`${constant < 1 ? "Reduction" : "Ampliation"} (${constant} * S1)`}
        signal={{ data: newData, offset: inputSignal.offset }}
      />
    </>
  )
}

const randomArray = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10))

const App = () => {
  const [signal1, setSignal1] = useState<signal>({ data: randomArray(20), offset: 10 })
  const [signal2, setSignal2] = useState<signal>({ data: randomArray(30), offset: 12 })

  const [operation, setOperation] = useState("add")

  return (
    <main>
      <div>
        <Signal title="Signal 1" signal={signal1} setSignal={setSignal1} />
        <Signal title="Signal 2" signal={signal2} setSignal={setSignal2} />
      </div>
      <div>
        <div className={styles.tableValue}>
          <Mic set={setSignal1} />
        </div>
        <form>
          <h2>Operations</h2>

          <div className={styles.operations}>
            <input
              defaultChecked={true}
              type="radio"
              name="operation"
              onClick={() => setOperation("add")}
            />
            <label>Add</label>

            <input type="radio" name="operation" onClick={() => setOperation("rest")} />
            <label>Rest</label>

            <input type="radio" name="operation" onClick={() => setOperation("ampl")} />
            <label>AmpliationAtenuation</label>

            <input type="radio" name="operation" onClick={() => setOperation("intr")} />
            <label>Interpolation</label>
          </div>
        </form>

        {operation === "add" && <Sum signal1={signal1} signal2={signal2} />}
        {operation === "rest" && <Rest signal1={signal1} signal2={signal2} />}
        {operation === "ampl" && <AmpliationAtenuation inputSignal={signal1} />}
      </div>
    </main>
  )
}

export default App
