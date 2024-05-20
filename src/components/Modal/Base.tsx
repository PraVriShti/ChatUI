import React, { useEffect, useRef, useImperativeHandle, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import useMount from '../../hooks/useMount';
import { Backdrop } from '../Backdrop';
import { IconButton } from '../IconButton';
import { Button, ButtonProps } from '../Button';
import useNextId from '../../hooks/useNextId';
import toggleClass from '../../utils/toggleClass';
import DownIcon from './DownIcon';
import UpIcon from './UpIcon';

export interface ModalProps {
  active?: boolean;
  baseClass?: string;
  className?: string;
  title?: string;
  titleId?: string;
  showClose?: boolean;
  autoFocus?: boolean;
  backdrop?: boolean | 'static';
  height?: number | string;
  overflow?: boolean;
  actions?: ButtonProps[];
  vertical?: boolean;
  btnVariant?: ButtonProps['variant'];
  bgColor?: string;
  onClose?: () => void;
  onBackdropClick?: () => void;
  children?: React.ReactNode;
  isCollapsed?: boolean;
}

export interface BaseModalHandle {
  wrapperRef: React.RefObject<HTMLDivElement>;
}

function clearModal() {
  if (!document.querySelector('.Modal') && !document.querySelector('.Popup')) {
    toggleClass('S--modalOpen', false);
  }
}

export const Base = React.forwardRef<BaseModalHandle, ModalProps>((props, ref) => {
  const {
    baseClass,
    active,
    className,
    title,
    showClose = true,
    autoFocus = true,
    backdrop = true,
    height,
    overflow,
    actions,
    vertical = true,
    btnVariant,
    bgColor,
    children,
    onBackdropClick,
    onClose,
    isCollapsed
  } = props;

  const [collapsed, setCollapsed] = useState(isCollapsed ?? true);

  const mid = useNextId('modal-');
  const titleId = props.titleId || mid;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const { didMount, isShow } = useMount({ active, ref: wrapperRef });

  useEffect(() => {
    setTimeout(() => {
      if (autoFocus && wrapperRef.current) {
        wrapperRef.current.focus();
      }
    });
  }, [autoFocus]);

  useEffect(() => {
    if (isShow) {
      toggleClass('S--modalOpen', isShow);
    }
  }, [isShow]);

  useEffect(() => {
    if (!active && !didMount) {
      clearModal();
    }
  }, [active, didMount]);

  useImperativeHandle(ref, () => ({
    wrapperRef,
  }));

  useEffect(
    () => () => {
      clearModal();
    },
    [],
  );

  if (!didMount) return null;

  const isPopup = baseClass === 'Popup';

  const toggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };

  return createPortal(
    <div className={clsx(baseClass, className, { active: isShow })} ref={wrapperRef} tabIndex={-1}>
      {backdrop && (
        <Backdrop
          active={isShow}
          onClick={backdrop === true ? onBackdropClick || onClose : undefined}
        />
      )}
      <div
        className={clsx(`${baseClass}-dialog`, { 'pb-safe': isPopup && !actions })}
        data-bg-color={bgColor}
        data-height={isPopup && height ? height : undefined}
        role="dialog"
        aria-labelledby={titleId}
        aria-modal
        style={{ maxHeight: collapsed ? '150px' : 'none' }}
      >
        <div className={`${baseClass}-content`}>
          <div className={`${baseClass}-header`}>
            <div onClick={toggleCollapse} style={{display: 'flex', justifyContent: 'flex-end', margin: '5px'}}>
              {collapsed ? <UpIcon height="15px" width="15px" /> : <DownIcon height="15px" width="15px" />}
            </div>
            <h5 className={`${baseClass}-title`} id={titleId}>
              {title}
              <div style={{height: '2px', width: '55px', backgroundColor: '#B0B0B0', margin: '10px auto 2px auto'}}>
              </div>
            </h5>
            {showClose && onClose && (
              <IconButton
                className={`${baseClass}-close`}
                icon="close"
                size="lg"
                onClick={onClose}
                aria-label="关闭"
              />
            )}
          </div>
          {!collapsed && (
            <>
              <div className={clsx(`${baseClass}-body`, { overflow })}>{children}</div>
              {actions && (
                <div
                  className={`${baseClass}-footer ${baseClass}-footer--${vertical ? 'v' : 'h'}`}
                  data-variant={btnVariant || 'round'}
                >
                  {actions.map((item) => (
                    <Button size="lg" block={isPopup} variant={btnVariant} {...item} key={item.label} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
});
