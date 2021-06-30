export { PdfHandle };
    import { debug } from 'console';
import React, { useState } from 'react';
import { Document, Page } from 'react-pdf/dist/esm/entry.webpack';

const options = {
    cMapUrl: '/dist/cmaps/',
    cMapPacked: true,
};

interface NumPages {
    numPages: number;
}

type FileState = {
    file: null | File;
}

function PdfHandle() {
    console.log(options.cMapUrl);
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [nowPage, setNowPage] = useState<number>(1);

    function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        if (event.target === null) return;
        if (event.target.files === null) return;
        setFile(event.target.files[0]);
    }
    
    function onDocumentLoadSuccess({ numPages: nextNumPages }: NumPages) {
        setNumPages(nextNumPages);
    }
    function onPageProcess(){
        if (numPages !== null && nowPage + 1 <= numPages) setNowPage(nowPage + 1);
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
                    file &&
                    <Document
                      file={file}
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
                <button onClick={() => { onPageProcess(); }} >
                    {'next'}
                </button>
                </div>
            </div>
        </div>
    );
}
