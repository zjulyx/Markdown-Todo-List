'use strict'

import { app, BrowserWindow, Menu, dialog } from 'electron'
import * as fileOperation from '../utils/fileOperation'
import * as constants from '../model/constants'

let mainWindow

let template = [{
    label: 'File',
    submenu: [{
        label: 'Open Todo List File',
        accelerator: 'CmdOrCtrl+O',
        click() {
            fileOperation.OpenMarkdownFile(mainWindow)
        }
    }]
}]

global.sharedData = {
    [constants.Files]: [],
    [constants.TabsData]: [],
    [constants.CurTab]: 0
}

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

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)

    // globalShortcut.register('CommandOrControl+S', () => {
    //     console.log('Save!')
    // })
}

app.on('ready', () => {
    createWindow()
    fileOperation.LoadUserDataFile(constants.UserDataFile, userData => {
        let files = userData[constants.Files]
        let curTab = userData[constants.CurTab]
        global.sharedData[constants.Files] = files
        global.sharedData[constants.CurTab] = curTab
        if (curTab >= files.length) {
            curTab = 0
        }
        for (let i = 0; i < files.length; ++i) {
            fileOperation.LoadMarkdownFile(files[i], res => {
                global.sharedData[constants.TabsData][i] = {
                    [constants.Content]: res,
                    [constants.FileName]: files[i]
                }
            })
        }
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
