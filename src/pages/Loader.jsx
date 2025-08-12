// Loader.jsx
import React from 'react';
import styled, { keyframes } from 'styled-components';

// --- Animation Keyframes ---

// Keyframes for the scanning line effect
const scan = keyframes`
  0%, 100% {
    transform: scaleX(0);
    transform-origin: left;
  }
  40%, 60% {
    transform: scaleX(1);
    transform-origin: left;
  }
  60.1%, 100% {
    transform-origin: right;
  }
`;

// Keyframes for the checkmark drawing and fading
const drawCheck = keyframes`
  0%, 25% {
    stroke-dashoffset: 48;
  }
  50% {
    stroke-dashoffset: 0;
  }
  75%, 100% {
    stroke-dashoffset: 0;
    opacity: 0;
  }
`;


// --- Styled Components ---

// The main wrapper for centering the loader
const LoaderWrapper = styled.div`
  width: 100%;
  height: ${props => (props.fullscreen ? '100vh' : '100%')};
  display: flex;
  justify-content: center;
  align-items: center;
`;

// Container for the scanning animation
const ScannerContainer = styled.div`
  width: 80px;
  height: 80px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
`;

// A single scanning line
const ScanLine = styled.div`
  width: 100%;
  height: 4px;
  background-color: #bdc3c7; // A soft grey color
  margin: 4px 0;
  border-radius: 2px;
  transform: scaleX(0);
  animation: ${scan} 2.5s linear infinite;

  // Stagger the animation for each line
  &:nth-child(1) {
    width: 60%;
    animation-delay: 0s;
  }
  &:nth-child(2) {
    width: 100%;
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    width: 80%;
    animation-delay: 0.4s;
  }
`;

// The checkmark SVG that appears after the scan
const Checkmark = styled.svg`
  width: 30px;
  height: 30px;
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  stroke: #27ae60; // A professional green
  stroke-width: 5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: ${drawCheck} 2.5s ease-in-out infinite;
  animation-delay: 0.6s; // Starts after the lines have animated
`;


// --- The Main Loader Component ---

const Loader = ({ fullscreen }) => {
    return (
        <LoaderWrapper fullscreen={fullscreen}>
            <ScannerContainer>
                {/* The scanning lines */}
                <ScanLine />
                <ScanLine />
                <ScanLine />

                {/* The checkmark icon */}
                <Checkmark viewBox="0 0 52 52">
                    <path d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                </Checkmark>
            </ScannerContainer>
        </LoaderWrapper>
    );
};

export default Loader;
