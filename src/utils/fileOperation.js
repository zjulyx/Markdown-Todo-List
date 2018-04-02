import fs from 'fs'
import path from 'path'
import * as markdownParser from './markdownParser'

function MakeDirs(dirname, callback) {
    fs.access(dirname, err => {
        if (!err) {
            if (callback) {
                callback()
            }
        } else {
            MakeDirs(path.dirname(dirname), function () {
                fs.mkdir(dirname, callback)
            })
        }
    })
}

export function LoadMarkdownFile(markdownFile, callback) {
    fs.access(markdownFile, (err) => {
        if (err) {
            MakeDirs(path.dirname(markdownFile), () => {
                fs.writeFile(markdownFile, '', err => {
                    if (err) {
                        console.log(err)
                    }
                    let res = {}
                    callback(res)
                })
            })
        } else {
            markdownParser.convertMarkDownToObj(markdownFile, callback)
        }
    })
}

export function SaveMarkdownFile(markdownFile, obj) {
    fs.writeFile(markdownFile, markdownParser.convertObjToMarkDown(obj), err => {
        if (err) {
            console.log(err)
        }
    })
}
