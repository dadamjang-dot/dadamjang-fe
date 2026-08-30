"use client";

import {
  ActionButton,
  Badge,
  Callout,
  Dialog,
  SidePanel,
  Skeleton,
  Snackbar,
  TextField,
  useSnackbarAdapter,
} from "@seed-design/react";
import { type ReactNode, useEffect, useRef } from "react";
import styles from "./admin-ui.module.css";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (node: T) => ReactNode;
  numeric?: boolean;
};

export const Page = ({ children }: { children: ReactNode }) => (
  <section className={styles.page}>{children}</section>
);

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) => (
  <header className={styles.pageHeader}>
    <div>
      <h1 className={styles.pageTitle}>{title}</h1>
      <p className={styles.pageDescription}>{description}</p>
    </div>
    {actions ? <div className={styles.headerActions}>{actions}</div> : null}
  </header>
);

export const FilterBar = ({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit?: () => void;
}) => (
  <form
    className={styles.filterBar}
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit?.();
    }}
  >
    {children}
  </form>
);

export const FilterControl = ({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) => (
  <label
    className={`${styles.filterControl} ${wide ? styles.filterControlWide : ""}`}
  >
    <span className={styles.controlLabel}>{label}</span>
    {children}
  </label>
);

export const AdminInput = (
  props: React.InputHTMLAttributes<HTMLInputElement>,
) => <input className={styles.nativeInput} {...props} />;

export const AdminSelect = (
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) => <select className={styles.nativeSelect} {...props} />;

export const AdminTextarea = (
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) => <textarea className={styles.nativeTextarea} {...props} />;

export const DataTable = <T,>({
  columns,
  nodes,
  rowKey,
  caption,
}: {
  columns: DataTableColumn<T>[];
  nodes: T[];
  rowKey: (node: T) => string;
  caption: string;
}) => (
  <div
    className={styles.tableScroll}
    tabIndex={0}
    aria-label={`${caption} 가로 스크롤 영역`}
  >
    <table className={styles.table}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={column.numeric ? styles.numeric : undefined}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {nodes.map((node) => (
          <tr key={rowKey(node)}>
            {columns.map((column) => (
              <td
                key={column.key}
                className={column.numeric ? styles.numeric : undefined}
              >
                {column.render(node)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const TableCard = ({ children }: { children: ReactNode }) => (
  <div className={styles.tableCard}>{children}</div>
);

export const EmptyState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className={styles.state}>
    <h2 className={styles.stateTitle}>{title}</h2>
    <p className={styles.stateDescription}>{description}</p>
  </div>
);

export const ErrorState = ({ retry }: { retry: () => void }) => (
  <div className={styles.state} role="alert">
    <h2 className={styles.stateTitle}>데이터를 불러오지 못했습니다</h2>
    <p className={styles.stateDescription}>
      잠시 후 다시 시도하거나 계속되면 운영 담당자에게 알려주세요.
    </p>
    <ActionButton variant="neutralOutline" onClick={retry}>
      다시 시도
    </ActionButton>
  </div>
);

export const TableSkeleton = () => (
  <div className={styles.skeletonRows} aria-label="목록 불러오는 중">
    {Array.from({ length: 6 }, (_, index) => (
      <Skeleton key={index} height="52px" width="100%" />
    ))}
  </div>
);

export const LoadMore = ({
  pending,
  onClick,
}: {
  pending: boolean;
  onClick: () => void;
}) => (
  <div className={styles.pagination}>
    <ActionButton variant="neutralOutline" loading={pending} onClick={onClick}>
      더 보기
    </ActionButton>
  </div>
);

const STATUS_TONE: Record<
  string,
  "neutral" | "informative" | "positive" | "warning" | "critical"
> = {
  PENDING: "warning",
  PAYMENT_PENDING: "warning",
  PAID: "informative",
  FULFILLING: "informative",
  APPROVED: "positive",
  ACCEPTED: "positive",
  COMPLETED: "positive",
  PUBLISHED: "positive",
  REJECTED: "critical",
  CANCELLED: "critical",
  FAILED: "critical",
  REVOKED: "critical",
  EXPIRED: "neutral",
  DRAFT: "neutral",
};

export const StatusBadge = ({
  status,
  label,
}: {
  status: string;
  label?: string;
}) => (
  <Badge variant="weak" tone={STATUS_TONE[status] ?? "neutral"}>
    {label ?? status}
  </Badge>
);

export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  critical = false,
  pending = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  critical?: boolean;
  pending?: boolean;
  onConfirm: () => boolean | void;
  children?: ReactNode;
}) => {
  const submitting = useRef(false);

  useEffect(() => {
    if (!open || !pending) submitting.current = false;
  }, [open, pending]);

  const handleConfirm = () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      if (onConfirm() === false) submitting.current = false;
    } catch (error) {
      submitting.current = false;
      throw error;
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
      role="alertdialog"
      closeOnEscape={!pending}
      closeOnInteractOutside={!pending}
    >
      <Dialog.Backdrop className={styles.dialogBackdrop} />
      <Dialog.Positioner className={styles.dialogPositioner}>
        <Dialog.Content className={styles.dialogContent}>
          <Dialog.Header className={styles.dialogHeader}>
            <Dialog.Title className={styles.dialogTitle}>{title}</Dialog.Title>
            <Dialog.Description className={styles.dialogDescription}>
              {description}
            </Dialog.Description>
          </Dialog.Header>
          {children ? (
            <div className={styles.dialogBody}>{children}</div>
          ) : null}
          <Dialog.Footer className={styles.dialogFooter}>
            <Dialog.Action asChild>
              <ActionButton variant="neutralOutline" disabled={pending}>
                취소
              </ActionButton>
            </Dialog.Action>
            <ActionButton
              disabled={pending}
              variant={critical ? "criticalSolid" : "neutralSolid"}
              loading={pending}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </ActionButton>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

export const DetailPanel = ({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) => (
  <SidePanel.Root open={open} onOpenChange={onOpenChange} direction="right">
    <SidePanel.Backdrop className={styles.panelBackdrop} />
    <SidePanel.Positioner className={styles.panelPositioner}>
      <SidePanel.Content className={styles.panelContent}>
        <SidePanel.Header className={styles.panelHeader}>
          <SidePanel.Title className={styles.panelTitle}>
            {title}
          </SidePanel.Title>
          <SidePanel.CloseButton aria-label="상세 닫기">
            닫기
          </SidePanel.CloseButton>
        </SidePanel.Header>
        <SidePanel.Body
          className={styles.panelBody}
          onPointerDown={(event) => {
            const target = event.target;
            if (
              target instanceof Element &&
              target.closest(
                "a, button, input, select, textarea, [role='button']",
              )
            ) {
              event.stopPropagation();
            }
          }}
        >
          {children}
        </SidePanel.Body>
      </SidePanel.Content>
    </SidePanel.Positioner>
  </SidePanel.Root>
);

export const DetailGrid = ({ children }: { children: ReactNode }) => (
  <dl className={styles.detailGrid}>{children}</dl>
);

export const DetailSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className={styles.detailSection}>
    <h3>{title}</h3>
    {children}
  </section>
);

export const Metadata = ({ children }: { children: string }) => (
  <pre className={styles.metadata}>{children}</pre>
);

export const FormStack = ({ children }: { children: ReactNode }) => (
  <div className={styles.formStack}>{children}</div>
);

export const InlineActions = ({ children }: { children: ReactNode }) => (
  <div className={styles.inlineActions}>{children}</div>
);

export const Card = ({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) => (
  <section className={styles.card}>
    {title ? <h2 className={styles.cardTitle}>{title}</h2> : null}
    {children}
  </section>
);

export const ApiCallout = ({ message }: { message: string }) => (
  <Callout.Root tone="critical">
    <Callout.Content>
      <Callout.Title>요청을 처리하지 못했습니다</Callout.Title>
      <Callout.Description>{message}</Callout.Description>
    </Callout.Content>
  </Callout.Root>
);

export const AdminTextField = ({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) => {
  const id = props.id ?? props.name;
  return (
    <label className={styles.filterControlWide} htmlFor={id}>
      <span className={styles.controlLabel}>{label}</span>
      <TextField.Root>
        <TextField.Input
          {...props}
          id={id}
          aria-label={label}
          aria-invalid={!!error}
        />
      </TextField.Root>
      {error ? <span role="alert">{error}</span> : null}
    </label>
  );
};

export const useAdminSnackbar = () => {
  const snackbar = useSnackbarAdapter();
  return (message: string) =>
    snackbar.create({
      render: () => (
        <Snackbar.Content>
          <Snackbar.Message>{message}</Snackbar.Message>
        </Snackbar.Content>
      ),
    });
};

export { styles as adminUiStyles };
