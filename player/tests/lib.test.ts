import { getGongTypeByName, getGongTypes } from "../src/lib";

const expectedFileNames = ['./sound/brass-bowl.mp3', './sound/big-ben.mp3', './sound/big-gong.mp3', './sound/silence.mp3', './sound/beep.mp3']

test('Gong sounds exist', () => {
    const fs = require('fs');
    const path = require('path');

    for (let type of getGongTypes(true)) {
        let file_name = getGongTypeByName(type.name).file_name
        expect(expectedFileNames).toContain(file_name)
        expect(fs.existsSync(path.resolve(file_name))).toBe(true)
    }
})

test('Fallback when gong type not found', () => {
    expect(getGongTypeByName('big-ben').file_name).toEqual('./sound/big-ben.mp3')

    // Fallback to default
    expect(getGongTypeByName('unknown').file_name).toEqual('./sound/brass-bowl.mp3')
})