import React, { useState, useEffect, useCallback, useRef } from 'react';
import clsx from 'clsx';
import { Input, InputProps } from '../Input';
import { SendConfirm } from '../SendConfirm';
import riseInput from './riseInput';
import parseDataTransfer from '../../utils/parseDataTransfer';
import canUse from '../../utils/canUse';
import { LangDetectionConfig, TransliterationConfig } from '../Chat';

const canTouch = canUse('touch');

interface ComposerInputProps extends InputProps {
  invisible: boolean;
  inputRef: React.MutableRefObject<HTMLTextAreaElement>;
  onImageSend?: (file: File) => Promise<any>;
  showTransliteration: boolean;
  transliterationConfig: TransliterationConfig | null;
  langDetectionConfig: LangDetectionConfig | null;
  cursorPosition: number;
  setCursorPosition: any;
}

export const ComposerInput = ({
  inputRef,
  invisible,
  onImageSend,
  disabled,
  showTransliteration,
  transliterationConfig,
  langDetectionConfig,
  value,
  onChange,
  cursorPosition,
  setCursorPosition,
  ...rest
}: ComposerInputProps) => {
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionClicked, setSuggestionClicked] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<number>(0);
  const controllerRef = useRef(new AbortController());

  const handlePaste = useCallback((e: React.ClipboardEvent<any>) => {
    parseDataTransfer(e, setPastedImage);
  }, []);

  const handleImageCancel = useCallback(() => {
    setPastedImage(null);
  }, []);

  const handleImageSend = useCallback(() => {
    if (onImageSend && pastedImage) {
      Promise.resolve(onImageSend(pastedImage)).then(() => {
        setPastedImage(null);
      });
    }
  }, [onImageSend, pastedImage]);

  useEffect(() => {
    if (canTouch && inputRef.current) {
      const $composer = document.querySelector('.Composer');
      riseInput(inputRef.current, $composer);
    }
  }, [inputRef]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (
      value &&
      //@ts-ignore
      value.length > 0 &&
      showTransliteration && transliterationConfig
    ) {
      if (suggestionClicked) {
        setSuggestionClicked(false);
        return;
      }

      setSuggestions([]);

      //@ts-ignore
      const words = value.split(' ');
      const wordUnderCursor = words.find(
        (word: any) =>
          //@ts-ignore
          cursorPosition >= value.indexOf(word) &&
          //@ts-ignore
          cursorPosition <= value.indexOf(word) + word.length,
      );
      if (!wordUnderCursor) return;
      fetch(transliterationConfig.transliterationApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "inputLanguage": transliterationConfig.transliterationInputLanguage,
          "outputLanguage": transliterationConfig.transliterationOutputLanguage,
          "input": wordUnderCursor,
          "provider": transliterationConfig?.transliterationProvider || "bhashini",
          "numSuggestions": transliterationConfig?.transliterationSuggestions || 3
        }),
        signal: controller.signal,
      })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`Error fetching transliteration: ${response.statusText}`);
        }
      })
        .then((data) => {
          setSuggestions(data?.suggestions);
        })
        .catch((error) => {
          console.error('Error fetching transliteration:', error);
        });
    } else {
      setSuggestions([]);
    }
    controllerRef.current = new AbortController();
    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, cursorPosition]);

  const suggestionClickHandler = useCallback(
    (e: any) => {
      //@ts-ignore
      const words = value.split(' ');
      const cursorPos = cursorPosition;
      let currentIndex = 0;
      let selectedWord = '';
      let selectedWordStart = 0;

      // Find the word at the cursor position
      for (let word of words) {
        if (currentIndex <= cursorPos && cursorPos <= currentIndex + word.length) {
          selectedWord = word;
          selectedWordStart = currentIndex;
          break;
        }
        currentIndex += word.length + 1; // +1 for space
      }

      if (selectedWord !== '') {
        //@ts-ignore
        const spaceAfter = selectedWordStart + selectedWord.length <= value.length ? ' ' : '';
        // Replace the selected word with the transliterated suggestion
        //@ts-ignore
        const newInputMsg = value.substring(0, selectedWordStart) +
        e +
        spaceAfter +
        //@ts-ignore
        value.substring(selectedWordStart + selectedWord.length);

        setSuggestions([]);
        setSuggestionClicked(true);
        setActiveSuggestion(0);
        //@ts-ignore
        onChange(newInputMsg, e);

        const newCursorPosition = selectedWordStart + e.length + spaceAfter.length;
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
            inputRef.current.focus();
          }
        }, 0);
      }
    },
    [value, cursorPosition, onChange],
  );

  // @ts-ignore
  const suggestionHandler = (e: any, index: number) => {
    setActiveSuggestion(index);
  };

  const handleKeyDown = useCallback(
    (e: any) => {
      if (e.keyCode === 229) return;
      if (suggestions.length > 0) {
        if (e.code === 'ArrowUp') {
          e.preventDefault();
          setActiveSuggestion((prevActiveSuggestion) =>
            prevActiveSuggestion > 0 ? prevActiveSuggestion - 1 : prevActiveSuggestion,
          );
        } else if (e.code === 'ArrowDown') {
          e.preventDefault();
          setActiveSuggestion((prevActiveSuggestion) =>
            prevActiveSuggestion < suggestions.length - 1
              ? prevActiveSuggestion + 1
              : prevActiveSuggestion,
          );
        } else if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32 || e.data === " ") {
          e.preventDefault();
          if (activeSuggestion >= 0 && activeSuggestion < suggestions.length) {
            suggestionClickHandler(suggestions[activeSuggestion]);
          } else {
            //@ts-ignore
            onChange(prevInputMsg + ' ');
          }
        }
      } else if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32 || e.data === " ") {
        if (langDetectionConfig?.languagePopupFlag && (typeof value === 'string') && langDetectionConfig?.langCheck && langDetectionConfig?.lang !== langDetectionConfig?.locale) {
          langDetectionConfig?.detectLanguage(value?.trim()?.split(' ')?.pop() || "").then((res) => {
            if (res?.language === langDetectionConfig?.match) {
              langDetectionConfig?.setShowLanguagePopup(true);
            }
          });
        }
      }
    },
    [activeSuggestion, suggestionClickHandler, suggestions],
  );

  useEffect(() => {
    if(langDetectionConfig?.transliterate && transliterationConfig){

      fetch(transliterationConfig.transliterationApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "inputLanguage": transliterationConfig.transliterationInputLanguage,
          "outputLanguage": transliterationConfig.transliterationOutputLanguage,
          "input": value,
          "provider": transliterationConfig?.transliterationProvider || "bhashini",
          "numSuggestions": transliterationConfig?.transliterationSuggestions || 3
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          setSuggestions([]);
          //@ts-ignore
          onChange(data?.suggestions[0] || value);
          langDetectionConfig?.setTransliterate(false);
        })
        .catch((error) => {
          console.error('Error fetching transliteration:', error);
        });

    }
  }, [langDetectionConfig?.transliterate])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    let input = document.getElementById('inputBox');
    input?.addEventListener('textInput', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      input?.removeEventListener('textInput', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div className={clsx({ 'S--invisible': invisible })}>
      <div className={'suggestions'}>
        {suggestions.map((elem, index) => {
          return (
            <div
              key={index}
              onClick={() => suggestionClickHandler(elem)}
              className={`suggestion`}
              style={activeSuggestion === index ? {backgroundColor: '#65c3d7'} : {}}
              onMouseEnter={(e) => suggestionHandler(e, index)}
            >
              {elem}
            </div>
          );
        })}
      </div>
      <Input
        data-testid="chatui-input-field"
        className="Composer-input"
        id="inputBox"
        rows={1}
        autoSize
        enterKeyHint="send"
        onPaste={onImageSend ? handlePaste : undefined}
        ref={inputRef}
        disabled={disabled}
        value={value}
        onChange={onChange}
        {...rest}
      />
      {pastedImage && (
        <SendConfirm file={pastedImage} onCancel={handleImageCancel} onSend={handleImageSend} />
      )}
    </div>
  );
};
