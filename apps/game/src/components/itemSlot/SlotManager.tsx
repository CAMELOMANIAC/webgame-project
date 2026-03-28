interface SlotManagerProps<T> {
  items: T[];
  // children이 함수 형태이며, 아이템 데이터를 인자로 받습니다.
  children: (item: T, index: number) => React.ReactNode;
}
const SlotManager = <T,>({ items, children }: SlotManagerProps<T>) => {
  return (
    <>
      {items.map((item, index) => (
        <div key={index}>{children(item, index)}</div>
      ))}
    </>
  );
};

export default SlotManager;
