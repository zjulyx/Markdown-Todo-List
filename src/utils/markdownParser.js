import fs from 'fs'
import path from 'path'
import readline from 'readline'
import * as constants from './constants'

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

// export function convertObjToMarkDown(obj) {
//     // todo: only save when exiting
// }

// function convertMarkDownToObj(markdownData, savedData) {
//     let contentArray = markdownData.split('\r\n')
//     // todo: parse title/date/each level todo(check,progress)
// }

// function parseEachLine(line, res) {
//     //
//     return res
// }
let curId = 0

function parseTodoItem(line) {
    // console.log(line)
    let arr = /[-|*]\s*\[(.*)\]\s*(.*)\(?(.*)%?\)?/.exec(line)
    // console.log(arr)
    let finished = arr[1].trim() === 'x'
    let label = arr[2].trim()
    let progress = parseFloat(arr[3]) * constants.MAXPROGRESS / 100
    if (isNaN(progress)) {
        progress = finished ? constants.MAXPROGRESS : 0
    }
    return {
        id: curId++,
        finished: finished,
        label: label,
        progress: progress,
        children: []
    }
}

export function LoadMarkdownFile(markdownFile, cb) {
    fs.access(markdownFile, (err) => {
        if (err) {
            mkdirs(path.dirname(markdownFile), () => {
                fs.writeFile(markdownFile, '', err => {
                    console.log(err)
                    let res = {}
                    cb(res)
                })
            })
        } else {
            let fRead = fs.createReadStream(markdownFile);
            let objReadline = readline.createInterface({
                input: fRead
            });
            let res = {}
            // let blankSeparator = ''
            let curDate = new Date().toLocaleDateString()
            // let prevBlankCount = 0
            // let curLevel = 1
            let stack = []
            objReadline.on('line', line => {
                // some operations
                switch (line[0]) {
                    case ' ':
                    case '\t':
                        if (!line.trimLeft().startsWith('-') && !line.trimLeft().startsWith('*')) {
                            break
                        }
                        let curNode = parseTodoItem(line.trimLeft())
                        let curBlankCount = line.length - line.trimLeft().length
                        let curLevel = curBlankCount / 4 + 1
                        if (curLevel <= stack.length) {
                            stack.splice(curLevel - 1, stack.length)
                        }
                        let parent = stack[stack.length - 1]
                        parent.children.push(curNode)
                        stack.push(curNode)
                        // if (curBlankCount > prevBlankCount) {
                        //     curLevel += 1
                        // } else if (curBlankCount < prevBlankCount) {
                        //     curLevel -= 1
                        // }
                        // if (curLevel < 1) {
                        //     curLevel = 1
                        // }
                        // prevBlankCount = curBlankCount
                        // let cur = res[curDate]
                        // for (let i = 0; i < curLevel; ++i) {
                        //     if (!('children' in cur)) {
                        //         cur.children = []
                        //         curLevel = i + 1
                        //         break
                        //     }
                        // }
                        break
                    case '#':
                        if (line.startsWith('##')) {
                            // date
                            let arr = /##(.*)/.exec(line)
                            curDate = new Date(arr[1].trim()).toLocaleDateString()
                        } else {
                            // title
                            let arr = /#(.*)/.exec(line)
                            res.title = arr[1].trim()
                        }
                        break
                    case '-':
                    case '*':
                        if (!(curDate in res)) {
                            res[curDate] = []
                        }
                        res[curDate].push(parseTodoItem(line))
                        stack = [res[curDate][0]]
                        break
                    default:
                        break
                }
                // if (line.startsWith('\t') || line.startsWith(' ')) {
                //     // nested level
                // } else if (line.startsWith('##')) {
                //     // date
                // } else if (line.startsWith('#')) {
                //     // title
                // } else if (line.startsWith('-')) {
                //     // root level
                // } else {
                // }
            })

            objReadline.on('close', () => {
                cb(res)
            })
        }
    })
}
