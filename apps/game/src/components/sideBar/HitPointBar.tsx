import type { CSSProperties } from "styled-components";

const HitPointBar = () => {
  return (
    <div style={paddingWrapperStyle}>
      <div>당신</div>
      <div>가방</div>
    </div>
  );
};

export default HitPointBar;

const paddingWrapperStyle: CSSProperties = {
  padding: "0.5rem",
};
