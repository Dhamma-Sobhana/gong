/**
 * Dummy classes for GPIO operations, to allow development on non-Raspberry Pi environments.
 */
class Gpio {
   static HIGH: number = 1
   static LOW: number = 0
   
   constructor(pin: number, direction: 'in' | 'out' | 'high' | 'low', edge?: 'none' | 'rising' | 'falling' | 'both') {
      const HIGH = 1
      const LOW = 0
      console.log(`[Gpio] Initialized pin ${pin} as ${direction}${edge ? ' with edge ' + edge : ''}`)
   }

   writeSync(value: BinaryValue) {
   }

   watch(callback: (err: Error | null, value: BinaryValue) => void) {
   }
}

class BinaryValue {
   static HIGH: BinaryValue = 1
   static LOW: BinaryValue = 0
}

export { Gpio, BinaryValue }