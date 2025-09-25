import { logArray } from "../src/log"

test('memory log maximum 100 entries', () => {
    expect(logArray.length).toBe(0)

    let repeat = 102
    while (repeat > 0) {
        console.log("test", repeat)
        repeat--
    }

    expect(logArray.length).toBe(100)
    expect(logArray[0]).toContain("test 100")
    expect(logArray[99]).toContain("test 1")
});