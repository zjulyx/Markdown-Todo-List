'use strict'

import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import * as fileOperation from '../utils/fileOperation'
import * as markdownParser from '../utils/markdownParser'
import * as util from '../utils/util'
import * as constants from '../model/constants'

global.sharedData = {
    [constants.Files]: [],
    [constants.TabsData]: [],
    [constants.CurTab]: 0,
    [constants.CurId]: 0,
    [constants.OnlyShowContentDate]: true
}

let mainWindow

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
    global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

const winURL = process.env.NODE_ENV === 'development'
    ? `http://localhost:9080`
    : `file://${__dirname}/index.html`

function createWindow() {
    /**
     * Initial window options
     */
    mainWindow = new BrowserWindow({
        height: 563,
        useContentSize: true,
        width: 1000
    })

    mainWindow.loadURL(winURL)

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

function createMenu(onlyShowContentDate) {
    let template = [
        {
            label: 'File',
            submenu: [{
                label: 'Open Todo List File',
                accelerator: 'CmdOrCtrl+O',
                click() {
                    fileOperation.OpenMarkdownFile(mainWindow)
                }
            }]
        },
        {
            label: 'Option',
            submenu: [{
                label: 'Only show date containing todo items',
                type: 'checkbox',
                checked: onlyShowContentDate,
                click(menuItem) {
                    mainWindow.webContents.send(constants.ToggleSwitchChannel, menuItem)
                }
            }]
        }
    ]
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

app.on('ready', () => {
    createWindow()
    fileOperation.LoadUserDataFile(constants.UserDataFile, userData => {
        let files = userData[constants.Files]
        let curTab = parseInt(userData[constants.CurTab])
        let onlyShowContentDate = userData[constants.OnlyShowContentDate]
        if (isNaN(curTab) || curTab < 0 || curTab >= files.length) {
            curTab = 0
        }
        curTab = curTab.toString()
        global.sharedData[constants.Files] = files
        global.sharedData[constants.CurTab] = curTab
        global.sharedData[constants.OnlyShowContentDate] = onlyShowContentDate
        createMenu(onlyShowContentDate)
        let count = 0
        files.forEach((file, index) => {
            fileOperation.LoadMarkdownFile(file, res => {
                global.sharedData[constants.TabsData][index] = util.GenerateNewTabData(file, res)
                if (++count === files.length) {
                    global.sharedData[constants.CurId] = markdownParser.CurId
                }
            })
        })
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow()
    }
})

ipcMain.on(constants.FileSaveChannel, () => {
    fileOperation.SaveMarkdownDialog(mainWindow)
})

ipcMain.on(constants.OpenDialogChannel, (evt, msg, type) => {
    console.log(evt, msg, type)
    util.ShowDialog(msg, type)
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
