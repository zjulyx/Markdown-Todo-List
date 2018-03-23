import fs from 'fs'
import path from 'path'

function mkdirs(dirname, callback) {
    fs.access(dirname, err => {
        if (!err) {
            // exist
            if (callback) {
                callback()
            }
        } else {
            mkdirs(path.dirname(dirname), function () {
                fs.mkdir(dirname, callback)
            })
        }
    })
}

export function convertObjToMarkDown(obj) {
    // todo: only save when exiting
}


function convertMarkDownToObj(markdownData, savedData) {
    let contentArray = markdownData.split('\r\n')
    // todo: parse title/date/each level todo(check,progress)

}

export function LoadMarkdownFile(markdownFile, savedData) {
    fs.readFile(markdownFile, 'utf8', (err, data) => {
        if (err) {
            // data file not exist will not show error box
            mkdirs(path.dirname(markdownFile), () => {
                fs.writeFile(markdownFile, '', () => {
                    // savedData = {}
                    // convertMarkDownToObj('', savedData)
                    LoadMarkdownFile(markdownFile, savedData)
                })
            })
        } else {
            // console.log(data)
            // ''.split()
            // console.log(data.split('\r\n'))
            // savedData = {}
            convertMarkDownToObj(data, savedData)
        }
    })
}

