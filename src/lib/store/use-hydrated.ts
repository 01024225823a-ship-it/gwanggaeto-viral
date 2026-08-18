"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * 서버 렌더 및 최초 하이드레이션 렌더에서는 false, 그 이후 클라이언트에서는 true.
 *
 * localStorage에서 복원한 값은 서버 HTML과 다를 수밖에 없으므로,
 * 이 플래그가 true가 된 뒤에만 복원된 데이터를 렌더링해 하이드레이션 불일치를 막는다.
 * (useEffect + setState 대신 사용해 불필요한 연쇄 렌더를 피한다)
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
