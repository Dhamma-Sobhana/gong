import { logArray } from "../src/log"

test('memory log maximum 10 entries', () => {
    expect(logArray.length).toBe(0)

    let repeat = 12
    while (repeat > 0) {
        console.log("test", repeat)
        repeat--
    }

    expect(logArray.length).toBe(10)
    expect(logArray[0]).toContain("test 10")
    expect(logArray[9]).toContain("test 1")
});