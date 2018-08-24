import React, { Fragment } from "react"
import ReactDOM from "react-dom"
import { Encode, Decode, Hash, DownloadData, HumanTime } from "./functions.js"
import History from "./history.js"
import WindowDrag from "./windowDrag.js"
import "./style.css"

var history = new History()
var windowDrag = new WindowDrag()

class App extends React.Component {
    constructor(){
        super()
        this.fileInputRef = React.createRef()
        windowDrag.onDrop = e => this.handleFileChange(e.dataTransfer.files) 
        windowDrag.onDragEnter = () => this.setState({ dragging: true })
        windowDrag.onDragLeave = () => this.setState({ dragging: false })
    }
    state = {
        gameFile: "", 
        gameFileOriginal: "",
        editing: false,
        dragging: false
    }
    handleFileClick = () => {
        this.fileInputRef.current.click()
    }
    handleFileChange = files => {
        if (files.length > 0){
            let file = files[0]
            let reader = new FileReader()
			
			// Difference between Switch and other platforms is lack of any encoding, it's just JSON.
			if (document.getElementById("switch-save").checked) reader.readAsText(file)
			else reader.readAsArrayBuffer(file)
		
            reader.addEventListener("load", () => {
                var result = reader.result
                try {
					let decrypted = ""
					if (document.getElementById("switch-save").checked) {
						decrypted = result
					}
					else {
						decrypted = Decode(new Uint8Array(result))
					}
					var jsonString = JSON.stringify(JSON.parse(decrypted), undefined, 2)
                    const hash = Hash(jsonString)
                    history.removeFromHistory(hash)
                    history.addToHistory(jsonString, file.name, hash)
                    history.syncToLocalStorage()
                    this.setGameFile(jsonString, file.name)
                } catch (err){
                    //window.alert("The file could not decrypted.")
                    console.warn(err)
                } 
                this.fileInputRef.current.value = null
            })
        }
    }
    handleEditorChange = e => {
        this.setState({gameFile: e.target.value})
    }
    handleReset = e => {
        this.setState({
            gameFile: this.state.gameFileOriginal
        }) 
    }
	handleDownloadAsSwitchSave = e => {
		try {
            var data = JSON.stringify(JSON.parse(this.state.gameFile))
            DownloadData(data, "encoded.dat")
        } catch (err){
            window.alert("Could not parse valid JSON. Reset or fix.")
        }
    }
    handleDownloadAsJSON = e => {
        DownloadData(this.state.gameFile, "decoded.json")
    }
    handleDownload = e => {
        try {
            var data = JSON.stringify(JSON.parse(this.state.gameFile))
            var encrypted = Encode(data)
            DownloadData(encrypted, "encoded.dat")
        } catch (err){
            window.alert("Could not parse valid JSON. Reset or fix.")
        }
    }
    setGameFile = (jsonString, name) => {
        jsonString = JSON.stringify(JSON.parse(jsonString), undefined, 2)
        this.setState({
            gameFile: jsonString,
            gameFileOriginal: jsonString,
            gameFileName: name, 
            editing: true 
        })
    }
    render(){
        return <div id="wrapper">
            {this.state.dragging && <div id="cover"></div>}
            <p id="description">This online utility allows you to modify a Hollow Knight save file. View the source code in the <a href="https://github.com/bloodorca/hollow">github repo</a>. You can also use this to convert your PC save to and from the Nintendo Switch.</p>
			<ul id="instructions">
                <li>Make a backup of your original file.</li>
                <li>Select or drag in the source save file you want to modify.</li>
                <li>Modify your save file. Ctrl-F / Cmd-F is your best friend.</li>
                <li>Download your new modifed save file.</li>
            </ul>
			<span>
				<input type="checkbox" id="switch-save"/>
				<label htmlFor="switch-save">Nintendo Switch Mode</label>
			</span>
			<button id="file-button" onClick={this.handleFileClick}>Select File</button>
            <input onChange={e => { this.handleFileChange(this.fileInputRef.current.files) }} id="file-input"  ref={this.fileInputRef} type="file"/>
            {this.state.editing && (
                <div id="editor-wrapper">
                    <span id="editor-name">{this.state.gameFileName}</span>
                    <textarea id="editor" onChange={this.handleEditorChange} value={this.state.gameFile} spellCheck={false}></textarea>
                    <div id="editor-buttons">
                        <button onClick={this.handleReset}>reset</button>
                        <button onClick={this.handleDownloadAsJSON}>download as json</button>
						<button onClick={this.handleDownloadAsSwitchSave}>download as Nintendo Switch save file</button>
                        <button onClick={this.handleDownload}>download as normal save file</button>
                    </div>
                </div>
            )}
            <HistoryComponent 
                handleClick={(jsonString, fileName) => this.setGameFile(jsonString, fileName)}
            />
        </div>
    }
}

class HistoryComponent extends React.Component {
    constructor(){
        super()
        history.onChange = () => {
            this.forceUpdate()
        }
    }
    render(){
        if (history.count() == 0) return null 
        return (
            <div id="history">
                <div>History</div>
                <div>Stores a limited amount of recent files. Do not use this as an alternative to making backups.</div>
                <ul>
                    {history.history.map(item => (
                        <li 
                            key={item.hash}
                            onClick={() => {
                                this.props.handleClick(item.jsonString, item.fileName)
                                window.scrollTo(0, 0)
                            }} 
                            onContextMenu={e => { 
                                history.removeFromHistory(item.hash); 
                                e.preventDefault(); 
                                history.syncToLocalStorage()
                            }} 
                            className="history-item"
                        >
                            <div className="history-name">{item.fileName}</div>
                            <div className="history-date">{HumanTime(item.date)}</div>
                        </li>
                    ))}
                </ul>
            </div>
        )
    }
}



ReactDOM.render(<App/>, document.querySelector("#root"))




