/* PDF を表示したり，送信したりする？
 *
*/

export { PdfHandle, FileState };
import { debug } from 'console';
import React, { useState } from 'react';
import { Document, Page } from 'react-pdf/dist/esm/entry.webpack';
import { PDFCommandType } from '../../../../PDFCommandType';
import { ClientState } from '../ts/clientState';

const options = {
    cMapUrl: '/dist/cmaps/',
    cMapPacked: true,
};

interface NumPages {
    numPages: number;
}

type FileState = null | File;

interface PdfHandlerProps{
    file: FileState
    sendPDFCommand: (com: PDFCommandType) => void
    sendPDFContent: (contetnt: FileState) => void
}

function PdfHandle(props: PdfHandlerProps) {
    const [numPages, setNumPages] = useState<number>(1);
    const [nowPage, setNowPage] = useState<number>(1);

    function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (event.target === null) return;
        if (event.target.files === null) return;
        props.sendPDFContent(event.target.files[0]);
        console.log("onFIleChange Called");
    }
    
    function onDocumentLoadSuccess({ numPages: nextNumPages }: NumPages) {
        setNumPages(nextNumPages);
    }
    function onPageProcess(){
        const newPage = nowPage + 1;
        if (numPages !== null && nowPage + 1 <= numPages){
            console.log("next page is " + newPage);
            setNowPage(newPage);
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
                      onLoadSuccess={onDocumentLoadSuccess}
                      options={options}
                    >
                        {/* {
                            Array.from(
                                new Array(numPages),
                                (el, index) => (
                                    <Page
                                        key={`page_${index + 1}`}
                                        pageNumber={index + 1}
                                    />
                                ),
                            )
                        } */}
                        <Page key={`page_1`} pageNumber={nowPage}/>
                    </Document>
                }
                <button onClick={() => { alert("clicked"); }} >
                    {'next'}
                </button>
                </div>
            </div>
        </div>
    );
}
