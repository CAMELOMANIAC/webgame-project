import * as styles from "./EnemyUnit.css";

interface EnemyUnitProps {
  name: string;
  left: string;
  top: string;
}

const EnemyUnit = ({ name, left, top }: EnemyUnitProps) => {
  return (
    <div className={styles.container} style={{ left, top }}>
      <div className={styles.unit} />
      <label className={styles.nameLabel}>{name}</label>
    </div>
  );
};

export default EnemyUnit;
