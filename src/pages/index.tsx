import Head from "next/head";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { api, type RouterOutputs } from "@/utils/api";

type PageData = RouterOutputs["page"]["getHome"]["page"];
type BlockData = RouterOutputs["page"]["getHome"]["blocks"][number];

const textStyles = {
  h1: "text-3xl font-semibold leading-tight",
  h2: "text-2xl font-semibold leading-tight",
  h3: "text-xl font-semibold leading-snug",
  p: "text-base leading-relaxed",
} as const;

export default function Home() {
  const utils = api.useUtils();
  const { data, isLoading } = api.page.getHome.useQuery();
  const page = data?.page;
  const pageId = page?.id ?? null;
  const pageTitle = page?.title ?? null;
  const [title, setTitle] = useState("");
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const lastServerTitleRef = useRef<string | null>(null);
  const [focusImageId, setFocusImageId] = useState<number | null>(null);

  const updateTitle = api.page.updateTitle.useMutation({
    onSuccess: (updated) => {
      lastServerTitleRef.current = updated.title;
      setTitle(updated.title);
      void utils.page.getHome.invalidate();
    },
    onError: () => {
      if (lastServerTitleRef.current !== null) {
        setTitle(lastServerTitleRef.current);
      }
    },
  });
  const addText = api.block.addText.useMutation({
    onSuccess: () => {
      void utils.page.getHome.invalidate();
    },
  });
  const addImage = api.block.addImage.useMutation({
    onSuccess: (created) => {
      setFocusImageId(created.id);
      void utils.page.getHome.invalidate();
    },
  });
  const updateText = api.block.updateText.useMutation({
    onSuccess: () => {
      void utils.page.getHome.invalidate();
    },
  });
  const updateImage = api.block.updateImage.useMutation({
    onSuccess: () => {
      void utils.page.getHome.invalidate();
    },
  });
  const deleteBlock = api.block.delete.useMutation({
    onSuccess: () => {
      void utils.page.getHome.invalidate();
    },
  });
  const moveBlock = api.block.move.useMutation({
    onSuccess: () => {
      void utils.page.getHome.invalidate();
    },
  });

  useEffect(() => {
    if (!pageId || pageTitle === null) return;
    const serverTitle = pageTitle;
    const prevServerTitle = lastServerTitleRef.current;
    lastServerTitleRef.current = serverTitle;

    if (isTitleFocused) return;

    if (prevServerTitle === null) {
      setTitle(serverTitle);
      return;
    }

    setTitle((current) => (current === prevServerTitle ? serverTitle : current));
  }, [pageId, pageTitle, isTitleFocused]);

  const handleTitleBlur = (page: PageData) => {
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle === page.title) {
      setTitle(page.title);
      return;
    }
    updateTitle.mutate({ pageId: page.id, title: nextTitle });
  };

  const handleAddText = (page: PageData) => {
    addText.mutate({ pageId: page.id, text: "", textStyle: "p" });
  };

  const handleAddImage = (pageId: number, insertAfterBlockId?: number) => {
    addImage.mutate({
      pageId,
      imageSrc: "",
      width: null,
      height: null,
      insertAfterBlockId,
    });
  };

  const handleSlashImage = (
    block: BlockData,
    textStyle: keyof typeof textStyles,
  ) => {
    if (block.type !== "text") return;
    updateText.mutate({
      id: block.id,
      text: "",
      textStyle,
    });
    handleAddImage(block.pageId, block.id);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white text-zinc-900">
        <div className="mx-auto flex min-h-[40vh] max-w-[720px] items-center justify-center px-6 py-16 text-sm text-zinc-400">
          Loading...
        </div>
      </main>
    );
  }

  if (!page) {
    return (
      <main className="min-h-screen bg-white text-zinc-900">
        <div className="mx-auto max-w-2xl px-6 py-16">No page found.</div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>Notion Lite</title>
        <meta name="description" content="Notion-lite editor" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen bg-white text-zinc-900">
        <div className="mx-auto flex max-w-[720px] flex-col gap-10 px-6 py-20">
          <input
            className="w-full rounded-lg bg-transparent px-2 py-1 text-5xl font-medium tracking-tight text-zinc-900 placeholder:text-zinc-400 transition-colors duration-150 focus-visible:bg-zinc-50/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-200"
            placeholder="Untitled"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onFocus={() => setIsTitleFocused(true)}
            onBlur={() => {
              setIsTitleFocused(false);
              handleTitleBlur(page);
            }}
          />

          <div className="flex flex-col gap-8">
            {data.blocks.map((block) =>
              block.type === "text" ? (
                <TextBlock
                  key={block.id}
                  block={block}
                  onUpdate={(id, text, textStyle) =>
                    updateText.mutate({ id, text, textStyle })
                  }
                  onDelete={(id) => deleteBlock.mutate({ id })}
                  onMove={(id, direction) =>
                    moveBlock.mutate({ blockId: id, direction })
                  }
                  onSlashImage={(textStyle) =>
                    handleSlashImage(block, textStyle)
                  }
                />
              ) : (
                <ImageBlock
                  key={block.id}
                  block={block}
                  autoFocus={focusImageId === block.id}
                  onAutoFocusDone={() => setFocusImageId(null)}
                  onUpdate={(id, imageSrc, width, height) =>
                    updateImage.mutate({ id, imageSrc, width, height })
                  }
                  onDelete={(id) => deleteBlock.mutate({ id })}
                  onMove={(id, direction) =>
                    moveBlock.mutate({ blockId: id, direction })
                  }
                />
              ),
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              className="rounded-lg border border-zinc-100 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100"
              onClick={() => handleAddText(page)}
            >
              Add Text
            </button>
            <button
              className="rounded-lg border border-zinc-100 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:border-zinc-200 hover:bg-zinc-50 active:bg-zinc-100"
              onClick={() => handleAddImage(page.id)}
            >
              Add Image
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

type TextBlockProps = {
  block: BlockData;
  onUpdate: (id: number, text: string, textStyle: keyof typeof textStyles) => void;
  onDelete: (id: number) => void;
  onMove: (id: number, direction: "up" | "down") => void;
  onSlashImage: (textStyle: keyof typeof textStyles) => void;
};

function TextBlock({ block, onUpdate, onDelete, onMove, onSlashImage }: TextBlockProps) {
  const [value, setValue] = useState(block.text ?? "");
  const [style, setStyle] = useState<keyof typeof textStyles>(
    block.textStyle ?? "p",
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSavedRef = useRef({
    text: block.text ?? "",
    textStyle: block.textStyle ?? "p",
  });

  useEffect(() => {
    setValue(block.text ?? "");
    setStyle(block.textStyle ?? "p");
    lastSavedRef.current = {
      text: block.text ?? "",
      textStyle: block.textStyle ?? "p",
    };
  }, [block.id, block.text, block.textStyle]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, style]);

  const handleBlur = () => {
    const lastSaved = lastSavedRef.current;
    if (value === lastSaved.text && style === lastSaved.textStyle) return;
    lastSavedRef.current = { text: value, textStyle: style };
    onUpdate(block.id, value, style);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      if (value.trim() === "/image") {
        event.preventDefault();
        setValue("");
        lastSavedRef.current = { text: "", textStyle: style };
        onSlashImage(style);
      }
    }
  };

  return (
    <div className="group relative -mx-2 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-zinc-50/80">
      <div className="grid grid-cols-[16px,1fr] gap-3">
        <div className="pt-2">
          <span
            aria-hidden="true"
            className="pointer-events-none select-none text-zinc-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            &vellip;&vellip;
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            className={`w-full resize-none overflow-hidden rounded-lg bg-transparent px-2 py-1 text-zinc-900 placeholder:text-zinc-400 transition-colors duration-150 focus-visible:bg-zinc-50/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-200 ${textStyles[style]}`}
            placeholder="Type /image and press Enter"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />

          <div className="pointer-events-none flex items-center justify-between gap-2 text-xs text-zinc-500 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
            <select
              className="rounded-lg border border-zinc-100 bg-white px-2 py-1 text-xs text-zinc-700 transition-colors duration-150 hover:border-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-200"
              value={style}
              onChange={(event) =>
                setStyle(event.target.value as keyof typeof textStyles)
              }
              onBlur={handleBlur}
            >
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="p">Paragraph</option>
            </select>

            <div className="flex gap-2">
              <button
                className="rounded-lg border border-zinc-100 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors duration-150 hover:border-zinc-200 hover:bg-zinc-100 active:bg-zinc-200"
                onClick={() => onMove(block.id, "up")}
              >
                Move Up
              </button>
              <button
                className="rounded-lg border border-zinc-100 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors duration-150 hover:border-zinc-200 hover:bg-zinc-100 active:bg-zinc-200"
                onClick={() => onMove(block.id, "down")}
              >
                Move Down
              </button>
              <button
                className="rounded-lg border border-zinc-100 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors duration-150 hover:border-zinc-200 hover:bg-zinc-100 active:bg-zinc-200"
                onClick={() => onDelete(block.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ImageBlockProps = {
  block: BlockData;
  autoFocus: boolean;
  onAutoFocusDone: () => void;
  onUpdate: (
    id: number,
    imageSrc: string,
    width: number | null,
    height: number | null,
  ) => void;
  onDelete: (id: number) => void;
  onMove: (id: number, direction: "up" | "down") => void;
};

function ImageBlock({
  block,
  autoFocus,
  onAutoFocusDone,
  onUpdate,
  onDelete,
  onMove,
}: ImageBlockProps) {
  const [src, setSrc] = useState(block.imageSrc ?? "");
  const [width, setWidth] = useState(
    block.imageWidth ? String(block.imageWidth) : "",
  );
  const [height, setHeight] = useState(
    block.imageHeight ? String(block.imageHeight) : "",
  );
  const srcRef = useRef<HTMLInputElement | null>(null);
  const lastSavedRef = useRef({
    src: block.imageSrc ?? "",
    width: block.imageWidth ?? null,
    height: block.imageHeight ?? null,
  });

  useEffect(() => {
    setSrc(block.imageSrc ?? "");
    setWidth(block.imageWidth ? String(block.imageWidth) : "");
    setHeight(block.imageHeight ? String(block.imageHeight) : "");
    lastSavedRef.current = {
      src: block.imageSrc ?? "",
      width: block.imageWidth ?? null,
      height: block.imageHeight ?? null,
    };
  }, [block.id, block.imageSrc, block.imageWidth, block.imageHeight]);

  useEffect(() => {
    if (autoFocus && srcRef.current) {
      srcRef.current.focus();
      onAutoFocusDone();
    }
  }, [autoFocus, onAutoFocusDone]);

  const parseDimension = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      return undefined;
    }
    return parsed;
  };

  const handleBlur = () => {
    const widthValue = parseDimension(width);
    const heightValue = parseDimension(height);
    if (widthValue === undefined || heightValue === undefined) {
      setWidth(lastSavedRef.current.width ? String(lastSavedRef.current.width) : "");
      setHeight(
        lastSavedRef.current.height ? String(lastSavedRef.current.height) : "",
      );
      return;
    }

    const lastSaved = lastSavedRef.current;
    if (
      src === lastSaved.src &&
      widthValue === lastSaved.width &&
      heightValue === lastSaved.height
    ) {
      return;
    }

    lastSavedRef.current = {
      src,
      width: widthValue,
      height: heightValue,
    };
    onUpdate(block.id, src, widthValue, heightValue);
  };

  const previewStyle = {
    width: block.imageWidth ? `${block.imageWidth}px` : undefined,
    height: block.imageHeight ? `${block.imageHeight}px` : undefined,
  };

  return (
    <div className="group relative -mx-2 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-zinc-50/80">
      <div className="grid grid-cols-[16px,1fr] gap-3">
        <div className="pt-2">
          <span
            aria-hidden="true"
            className="pointer-events-none select-none text-zinc-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            &vellip;&vellip;
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {block.imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.imageSrc}
              alt=""
              style={previewStyle}
              className="max-w-full rounded-lg border border-zinc-100 bg-white"
            />
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-100 bg-zinc-50/50 px-3 py-6 text-sm text-zinc-400">
              Add an image URL below
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              ref={srcRef}
              className="rounded-lg border border-zinc-100 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-150 hover:border-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-200 sm:col-span-3"
              placeholder="Image URL"
              value={src}
              onChange={(event) => setSrc(event.target.value)}
              onBlur={handleBlur}
            />
            <input
              className="rounded-lg border border-zinc-100 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-150 hover:border-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-200"
              placeholder="Width (px)"
              type="number"
              min={1}
              step={1}
              value={width}
              onChange={(event) => setWidth(event.target.value)}
              onBlur={handleBlur}
            />
            <input
              className="rounded-lg border border-zinc-100 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-150 hover:border-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-200"
              placeholder="Height (px)"
              type="number"
              min={1}
              step={1}
              value={height}
              onChange={(event) => setHeight(event.target.value)}
              onBlur={handleBlur}
            />

            <div className="pointer-events-none flex items-center justify-end gap-2 text-xs text-zinc-500 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 sm:col-span-3">
              <button
                className="rounded-lg border border-zinc-100 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors duration-150 hover:border-zinc-200 hover:bg-zinc-100 active:bg-zinc-200"
                onClick={() => onMove(block.id, "up")}
              >
                Move Up
              </button>
              <button
                className="rounded-lg border border-zinc-100 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors duration-150 hover:border-zinc-200 hover:bg-zinc-100 active:bg-zinc-200"
                onClick={() => onMove(block.id, "down")}
              >
                Move Down
              </button>
              <button
                className="rounded-lg border border-zinc-100 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors duration-150 hover:border-zinc-200 hover:bg-zinc-100 active:bg-zinc-200"
                onClick={() => onDelete(block.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
