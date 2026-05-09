import React from "react";
import { useSelector } from "react-redux";
import ExportGuest from "./ExportGuest";
import { exportClientSide } from "../../../const/const";

const ExtendsComponent = () => {
const textEffect = useSelector((state) => state.textEffect.text);
    return (    
        <div className="extentds-component-container">
               <button onClick={() => exportClientSide()}>Quay màn hình và tải về</button>
               <button onClick={() => exportClientSide()}>Render và tải về (Server)</button>
        </div>
    )
}
export default ExtendsComponent;