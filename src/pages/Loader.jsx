import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoaderWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
`;

const Spinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #2563EB;
  animation: ${spin} 1s ease infinite;
`;

const FullscreenWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
`;

const Loader = ({ fullscreen = false }) => {
  if (fullscreen) {
    return (
      <FullscreenWrapper>
        <Spinner />
      </FullscreenWrapper>
    )
  }
  return (
    <LoaderWrapper>
      <Spinner />
    </LoaderWrapper>
  );
};

export default Loader;

