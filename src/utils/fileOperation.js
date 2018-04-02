import fs from 'fs'
import path from 'path'
import * as markdownParser from './markdownParser'
import * as constants from '../model/constants';

function mkdirs(dirname, callback) {
    fs.access(dirname, err => {
        if (!err) {
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

function handleFileNotExist(file, callback, initData) {
    mkdirs(path.dirname(file), () => {
        fs.writeFile(file, JSON.stringify(initData), err => {
            if (err) {
                console.log(err)
            }
            callback(initData)
        })
    })
}

export function LoadMarkdownFile(markdownFile, callback) {
    fs.access(markdownFile, (err) => {
        if (err) {
            handleFileNotExist(markdownFile, callback, {})
        } else {
            markdownParser.convertMarkDownToObj(markdownFile, callback)
        }
    })
}

export function LoadUserDataFile(userDataFile, callback) {
    fs.readFile(userDataFile, 'utf-8', (err, res) => {
        if (err) {
            handleFileNotExist(
                userDataFile,
                callback,
                {
                    [constants.Files]: [],
                    [constants.CurTab]: '0'
                }
            )
        } else {
            callback(JSON.parse(res))
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

export function SaveUserDataFile(userDataFile, obj) {
    fs.writeFile(userDataFile, JSON.stringify(obj), err => {
        if (err) {
            console.log(err)
        }
    })
}
