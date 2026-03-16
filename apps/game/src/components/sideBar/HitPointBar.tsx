import styled from "styled-components";

const HitPointBar = () => {
  return (
    <ProfileSection>
      <AvatarBadge>🛡️</AvatarBadge>
      <ProfileInfo>
        <ProfileName>Grand Master</ProfileName>
        <LevelBadge>LV. 42</LevelBadge>
      </ProfileInfo>
    </ProfileSection>
  );
};

const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const AvatarBadge = styled.div`
  width: 3.5rem;
  height: 3.5rem;
  background: #3498db;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  box-shadow: 0 0 15px rgba(52, 152, 219, 0.3);
`;

const ProfileInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ProfileName = styled.div`
  font-weight: 700;
  color: #ecf0f1;
  font-size: 1rem;
`;

const LevelBadge = styled.div`
  font-size: 0.7rem;
  font-weight: 800;
  color: #f1c40f;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

export default HitPointBar;
