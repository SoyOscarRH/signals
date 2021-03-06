import { useState, Dispatch, SetStateAction, useEffect, useRef } from "react"
import Plot from "react-plotly.js"
import styles from "./App.module.css"

type signal = { data: Array<number>; offset: number }

const Mic = ({ set }: { set: (id: number, signal: signal) => void }) => {
  const [playing, setPlaying] = useState(false)
  const downloadRef = useRef<HTMLAnchorElement | null>(null)

  const [id, setID] = useState<1 | 2>(1)

  useEffect(() => {
    if (playing) {
      const streamRef = { current: null } as { current: null | MediaStream }
      navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
        const recordedChunks = [] as Array<Blob>
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })

        mediaRecorder.addEventListener("dataavailable", ({ data }) => {
          if (data.size > 0) recordedChunks.push(data)
        })

        mediaRecorder.addEventListener("stop", () => {
          if (!downloadRef.current) return

          const blob = new Blob(recordedChunks)
          downloadRef.current.href = URL.createObjectURL(blob)
          downloadRef.current.download = "test.wav"

          const audioContext = new AudioContext()

          const reader = new FileReader()
          reader.onload = () =>
            audioContext.decodeAudioData(reader.result as ArrayBuffer, decodedDone)

          reader.readAsArrayBuffer(blob)
          const decodedDone: DecodeSuccessCallback = (decoded: AudioBuffer) => {
            let dataFloats = new Float32Array(decoded.length)
            dataFloats = decoded.getChannelData(0)

            const data = Array.from(dataFloats)
            const data2 = []

            for (let i = 0; i < data.length; i += 10) {
              data2.push(data[i])
            }
            set(id, { data: data2, offset: 0 })
          }
        })

        mediaRecorder.start()
        streamRef.current = stream
        console.log("creating new stream", stream.id)
      })

      return () => {
        console.log("cleaning stream", streamRef.current!.id)
        streamRef.current?.getTracks().forEach(t => t.stop())
      }
    }
  }, [playing, id, set])

  return (
    <>
      <h2>Record from Mic for signal {id}</h2>
      <section className={styles.mic}>
        <form>
          <div>
            <input type="radio" defaultChecked={true} name="id" onClick={() => setID(1)} />
            <span>signal 1</span>
          </div>
          <div>
            <input type="radio" name="id" onClick={() => setID(2)} />
            <span>signal 2</span>
          </div>
        </form>
        <div>
          <a href="/" ref={downloadRef}>
            Download current recording
          </a>
        </div>
        <button onClick={() => setPlaying(p => !p)} type="button">
          {playing ? "Recording..." : "Record"}
        </button>
      </section>
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

  if (signal.data.includes(NaN)) {
    return null
  }

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

      <h2
        onClick={() => {
          let audioCtx = new AudioContext()

          let myArrayBuffer = audioCtx.createBuffer(1, signal.data.length, audioCtx.sampleRate / 10)

          for (let channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
            var nowBuffering = myArrayBuffer.getChannelData(channel)
            for (var i = 0; i < myArrayBuffer.length; i++) {
              nowBuffering[i] = signal.data[i]
            }
          }

          var source = audioCtx.createBufferSource()
          source.buffer = myArrayBuffer
          source.connect(audioCtx.destination)
          source.start()
        }}
      >
        Play it
      </h2>
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

const Reflex = ({ inputSignal }: { inputSignal: signal }) => {
  const newData = [...inputSignal.data]
  newData.reverse()

  return (
    <>
      <Signal
        title="Reflex(S1)"
        signal={{ data: newData, offset: newData.length - 1 - inputSignal.offset }}
      />
    </>
  )
}

const Move = ({ inputSignal }: { inputSignal: signal }) => {
  const [constant, setConstant] = useState(2)

  const newData = [...inputSignal.data]
  return (
    <>
      <input
        className={styles.inputConstant}
        step={1}
        onChange={e => setConstant(+e.target.value)}
        type="number"
        value={constant}
      />
      <Signal
        title={`Move(S1, by ${constant})`}
        signal={{ data: newData, offset: inputSignal.offset - constant }}
      />
    </>
  )
}

const Interpolation = ({ inputSignal }: { inputSignal: signal }) => {
  const [steps, setConstant] = useState(2)
  const newData = []

  const n = steps < 1 ? Math.round(1 / steps) : steps

  if (steps < 1) {
    for (let i = 0; i < inputSignal.data.length; ++i) {
      if (i % n === 0) {
        newData.push(inputSignal.data[i])
      }
    }
  } else {
    for (let i = 0; i < inputSignal.data.length; ++i) {
      let [y1, y2] = [inputSignal.data[i], inputSignal.data[i + 1]]
      if (i === inputSignal.data.length - 1) y2 = y1
      const distance = y2 - y1

      for (let n = 0; n < steps; ++n) {
        newData.push(y1 + (n / steps) * distance)
      }
    }
    if (steps !== 1) {
      newData.pop()
    }
  }

  return (
    <>
      <input
        className={styles.inputConstant}
        min={0}
        onChange={e => setConstant(+e.target.value)}
        type="number"
        value={steps}
      />
      <Signal
        title={`${steps < 1 ? "Diesmacion" : "Interpolation"}(S1, by ${n})`}
        signal={{ data: newData, offset: inputSignal.offset * n }}
      />
    </>
  )
}

const Convolution = ({ signal1, signal2 }: ConvolutionProps) => {
  let result = {} as Record<string, number>
  let aux = {} as Record<string, number>
  let offset = signal1.offset + signal2.offset

  let auxa = 0
  let auxb = 0
  for (let i = 0; i < signal2.data.length; i++, auxa++) {
    for (let j = 0; j < signal1.data.length; j++, auxb++) {
      aux[`${j + auxa}`] = signal2.data[i] * signal1.data[j]
      result[`${j + auxa}`] = (result[j + auxa] ?? 0) + (aux[j + auxa] ?? 0)
    }
  }

  const data = []
  for (const index in result) {
    data[+index] = result[index]
  }

  return (
    <>
      <Signal title="Convolution(S1, S2)" signal={{ data, offset }} />
    </>
  )
}

const randomArray = (n: number) =>
  Array.from({ length: n }, () => Math.floor(Math.random() * 10)).map((v, i) =>
    Math.sin(i * 1000000)
  )

const App = () => {
  const [signal1, setSignal1] = useState<signal>({
    data: [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2],
    offset: 1,
  })
  const [signal2, setSignal2] = useState<signal>({ data: randomArray(3), offset: 1 })

  const [operation, setOperation] = useState("add")

  return (
    <main>
      <div>
        <Signal title="Signal 1" signal={signal1} setSignal={setSignal1} />
        <Signal title="Signal 2" signal={signal2} setSignal={setSignal2} />
      </div>
      <div>
        <div className={styles.tableValue}>
          <Mic set={(id, signal) => (id === 1 ? setSignal1(signal) : setSignal2(signal))} />
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

            <input type="radio" name="operation" onClick={() => setOperation("reflex")} />
            <label>Reflex</label>

            <input type="radio" name="operation" onClick={() => setOperation("move")} />
            <label>Move</label>

            <input type="radio" name="operation" onClick={() => setOperation("intr")} />
            <label>Interpolate / Dismation</label>

            <input type="radio" name="operation" onClick={() => setOperation("conv")} />
            <label>Convolution</label>
          </div>
        </form>

        {operation === "add" && <Sum signal1={signal1} signal2={signal2} />}
        {operation === "rest" && <Rest signal1={signal1} signal2={signal2} />}
        {operation === "ampl" && <AmpliationAtenuation inputSignal={signal1} />}
        {operation === "reflex" && <Reflex inputSignal={signal1} />}
        {operation === "move" && <Move inputSignal={signal1} />}
        {operation === "intr" && <Interpolation inputSignal={signal1} />}
        {operation === "conv" && <Convolution signal1={signal1} signal2={signal2} />}
      </div>
    </main>
  )
}

export default App
