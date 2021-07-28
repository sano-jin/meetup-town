/* PDF を表示したり，送信したりする？
 *
*/

export { PdfHandle, FileState, PageNumber };
import { debug } from 'console';
import React, { useState } from 'react';
import { Document, Page } from 'react-pdf/dist/esm/entry.webpack';
import { IgnorePlugin } from 'webpack';
import { PDFCommandType } from '../../../../PDFCommandType';
import { ClientState } from '../ts/clientState';

const options = {
    cMapUrl: '/dist/cmaps/',
    cMapPacked: true,
};

type PageNumber = undefined | number;

type FileState = null | File;

interface PdfHandlerProps{
    file: FileState
    nowPage: PageNumber
    numPages: PageNumber
    setNumPages: (numPages: PageNumber) => void //PDFのページ数をセット
    sendPDFCommand: (com: PDFCommandType) => void // コンテンツの何ページを開いてねとかの指示
    sendPDFContent: (contetnt: FileState) => void
}

function PdfHandle(props: PdfHandlerProps) {
    //const [numPages, setNumPages] = useState<number>(1);
    //const [nowPage, setNowPage] = useState<number>(1);

    function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (event.target === null) return;
        if (event.target.files === null) return;
        props.sendPDFContent(event.target.files[0]);
    }
    function onPageProcess(){
        console.log(props.nowPage);
        console.log(props.numPages);
        if(props.nowPage == null || props.numPages == null) return;
        const newPage = props.nowPage + 1;
        console.log(0 <= props.numPages);
        if (1 <= newPage && newPage <= props.numPages){
            console.log("next page is " + newPage);
            const com: PDFCommandType = {command: newPage.toString()};
            props.sendPDFCommand(com);
        }
    }
    function onPageBack(){
        if(props.nowPage == null || props.numPages == null) return;
        const newPage = props.nowPage - 1;
        if (1 <= newPage && newPage <= props.numPages){
            console.log("next page is " + newPage);
            //setNowPage(newPage);
            const com: PDFCommandType = {command: newPage.toString()};
            props.sendPDFCommand(com);
        }
    }

    return (
        <div className="Example">

            <div className="Example__container">
                <div className="Example__container__load">
                    <label htmlFor="file">Load from file:</label>
                    {' '}
                    <input
                        onChange={onFileChange}
                        type="file"
                    />
                </div>
                <div className="Example__container__document">
                { 
                    props.file &&
                    <Document
                      file={props.file}
                      onLoadSuccess={ ({ numPages }) => { props.setNumPages(numPages); } }
                      options={options}
                    >
                        <Page key={`page_1`} pageNumber={props.nowPage}/>
                    </Document>
                }
                <button onClick={onPageBack} >
                    {'back'}
                </button>
                <button onClick={onPageProcess} >
                    {'next'}
                </button>
                </div>
            </div>
        </div>
    );
}
