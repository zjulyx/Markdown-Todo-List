import path from 'path'

export const MainProcess = 'browser'
export const RendererProcess = 'renderer'
export const MAXPROGRESS = 4
export const UserDataFileName = 'UserData.json'
export const UserDataFile = path.join(process.env.APPDATA || process.env.HOME, 'MarkdownTodoList', UserDataFileName)

export const FullHeight = 'FullHeight'
export const FullWidth = 'FullWidth'

export const FilterText = 'FilterText'
export const TabsData = 'TabsData'
export const CurTab = 'CurTab'
export const CurDate = 'CurDate'
export const CurId = 'CurId'
export const NewTodo = 'NewTodo'
export const Title = 'Title'
export const TitleNotEditing = 'TitleNotEditing'
export const Content = 'Content'
export const FileName = 'FileName'
export const Files = 'Files'
export const OnlyShowContentDate = 'OnlyShowContentDate'
export const AutoSync = 'AutoSync'
export const DebounceMs = 5 * 1000
export const AccessToken = 'AccessToken'
export const GistId = 'GistId'
export const GistDescription = 'Markdown Todolist User Data'
export const LoginDialogVisible = 'LoginDialogVisible'

export const FileOpenChannel = "FileOpenChannel"
export const FileOpenedChannel = "FileOpenedChannel"
export const ToggleSwitchChannel = "ToggleSwitchChannel"
export const SyncChannel = "SyncChannel"

export const Upload = "Upload"
export const Download = "Download"

export const ClientID = process.env.MARKDOWNTODOLIST_OAUTH_CLIENT_ID
export const ClientSecret = process.env.MARKDOWNTODOLIST_OAUTH_CLIENT_SECRET

export const DialogTypes = {
    info: "info",
    warning: "warning",
    error: "error",
    question: "question"
}

export const InitSettings = {
    [Files]: [],
    [CurTab]: '0',
    [OnlyShowContentDate]: true,
    [AutoSync]: false,
    [GistId]: '',
    [AccessToken]: ''
}
