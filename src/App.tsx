import { useState, Dispatch, SetStateAction, useEffect, useRef } from "react";

import styles from "./App.module.css";

type signal = [Array<number>, number];

type SignalProps = {
  signal: signal;
  setSignal?: Dispatch<SetStateAction<signal>>;
};
const Signal = ({ signal, setSignal }: SignalProps) => {
  const [data, zero] = signal;
  const [adding, setAdding] = useState(false);

  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (input.current) {
      input.current.value = "";
    }
  }, [adding]);

  return (
    <div>
      Signal:
      <table>
        <thead>
          <tr>
            <th>index</th>
            <th>value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((v, i) => (
            <tr key={i}>
              <th onClick={() => setSignal && setSignal(([d, z]) => [d, i])}>
                {i - zero}
              </th>
              <th>{v}</th>
            </tr>
          ))}

          {setSignal && (
            <tr>
              <th>{data.length - zero}</th>
              <th>
                {adding ? (
                  <input
                    ref={input}
                    onKeyDown={({ code }) => {
                      if (code !== "Enter") return;
                      setSignal(([d, z]) => {
                        const d2 = [...d];

                        if (input.current) {
                          d2.push(+input.current.value);
                        }
                        setAdding(false);

                        return [d2, z];
                      });
                    }}
                    className={styles.input}
                  />
                ) : (
                  <span onClick={() => setAdding(true)}>+</span>
                )}
              </th>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

type ConvolutionProps = {
  signal1: signal;
  signal2: signal;
};

const get = (signal: signal, index: number) => {
  const [data, offset] = signal;
  const min = -offset;
  const max = data.length - offset;

  if (index < min || index >= max) {
    return 0;
  }

  return data[index + offset];
};

const Convolution = ({ signal1, signal2 }: ConvolutionProps) => {
  const min = Math.min(-signal1[1], -signal2[1]);
  const max = Math.max(
    signal1[0].length - signal1[1],
    signal2[0].length - signal2[1]
  );

  const data = [];
  for (let i = min; i < max; ++i) {
    data.push(get(signal1, i) + get(signal2, i));
  }

  const signal = [data, -min] as signal;

  return (
    <>
      <Signal signal={signal} />
    </>
  );
};

const App = () => {
  const [signal1, setSignal1] = useState<signal>([[3, -1, 2, 5], 1]);
  const [signal2, setSignal2] = useState<signal>([[-2, 4, 0.5], 2]);
  return (
    <main>
      <section className={styles.signals}>
        <Signal signal={signal1} setSignal={setSignal1} />
        <Signal signal={signal2} setSignal={setSignal2} />
      </section>
      <Convolution signal1={signal1} signal2={signal2} />
    </main>
  );
};

export default App;
