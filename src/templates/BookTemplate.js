import React, { useEffect, useState, useRef } from "react";
import { graphql, Link } from "gatsby";
import { useInView } from "react-intersection-observer";
import classnames from "classnames";

import { decryptBuffer, createBlobUrl } from "../utils/crypto";
import { fetchWithRetries } from "../utils/fetch";
import Layout from "../components/Layout";
import Logo from "../components/Logo";
import IconSettings from "../components/IconSettings";
import Image from "../components/Image";
import useLocalStorage from "../hooks/useLocalStorage";
import useWindowSize from "../hooks/useWindowSize";

import * as styles from "./BookTemplate.module.css";

const READING_MODE_KEY = "reading_mode";
const READING_MODE_WIDTH = "width";
const READING_MODE_ORIGINAL = "original";

export default function BookTemplate(props) {
  const {
    data: {
      bookMeta: { dimensions, name },
      bookPages,
    },
    pageContext: { prevPath, nextPath },
  } = props;
  const [readingMode, setReadingMode] = useLocalStorage(
    READING_MODE_KEY,
    READING_MODE_WIDTH
  );
  const { height: windowHeight } = useWindowSize();
  const [navHidden, setNavHidden] = useState(true);

  function onPageClick() {
    setNavHidden((flag) => !flag);
  }

  function onSettingsButtonClick() {
    setReadingMode(
      readingMode === READING_MODE_WIDTH
        ? READING_MODE_ORIGINAL
        : READING_MODE_WIDTH
    );
  }

  return (
    <Layout>
      <Header
        title={name}
        hidden={navHidden}
        onSettingsButtonClick={onSettingsButtonClick}
        {...{ prevPath, nextPath }}
      />
      {bookPages.edges.map(({ node: { publicURL } }, index) => {
        const [pageWidth, pageHeight] = dimensions[index];
        return (
          <Page
            {...{
              index,
              pageHeight,
              pageWidth,
              publicURL,
              readingMode,
              windowHeight,
              onPageClick,
            }}
            key={publicURL}
          />
        );
      })}
      <div className={styles.footer}>
        {prevPath != null ? (
          <Link to={prevPath} className={styles.footerNavButton}>
            PREV
          </Link>
        ) : null}
        {nextPath != null ? (
          <Link to={nextPath} className={styles.footerNavButton}>
            NEXT
          </Link>
        ) : null}
      </div>
    </Layout>
  );
}

function Header(props) {
  const { title, hidden, onSettingsButtonClick, prevPath, nextPath } = props;
  const headerClassName = classnames(styles.header, {
    [styles.headerHidden]: hidden,
  });

  return (
    <div className={headerClassName}>
      <div className={styles.headerLeftSection}>
        <Link to="/" className={styles.headerBackLink}>
          <Logo className={styles.headerBackIcon} />
        </Link>
        <div>
          <p className={styles.headerTitle}>{title}</p>
        </div>
        {prevPath != null ? (
          <Link to={prevPath} className={styles.headerNavButton}>
            PREV
          </Link>
        ) : null}
        {nextPath != null ? (
          <Link to={nextPath} className={styles.headerNavButton}>
            NEXT
          </Link>
        ) : null}
      </div>
      <div className={styles.headerRightSection}>
        <button className={styles.headerButton} onClick={onSettingsButtonClick}>
          <IconSettings className={styles.headerIcon} />
        </button>
      </div>
    </div>
  );
}

function Page(props) {
  const {
    index,
    pageHeight,
    pageWidth,
    publicURL,
    readingMode,
    windowHeight,
    onPageClick,
  } = props;
  const [imageBuffer, setImageBuffer] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const onceRef = useRef(false);
  const { ref, inView } = useInView({
    rootMargin: `${windowHeight * 2.5}px 0px ${windowHeight * 5}px`,
  });

  useEffect(() => {
    async function fetchImage() {
      const res = await fetchWithRetries(publicURL, 1000, 5);
      const buffer = await res.arrayBuffer();
      setImageBuffer(decryptBuffer(buffer));
    }
    if (inView && !onceRef.current) {
      fetchImage();
      onceRef.current = true;
    }
  }, [inView]);

  useEffect(() => {
    if (inView) {
      setBlobUrl(createBlobUrl(imageBuffer));
    }

    return () => {
      if (blobUrl != null) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [imageBuffer, inView]);

  const pageRatio = pageHeight / pageWidth;

  return (
    <div
      className={styles.page}
      ref={ref}
      onClick={(e) => onPageClick(e, index)}
    >
      <div
        className={styles.pageWrapper}
        style={
          readingMode === READING_MODE_ORIGINAL
            ? {
                width: `${pageWidth}px`,
              }
            : { width: "100%" }
        }
      >
        <div
          className={styles.pagePadding}
          style={{
            paddingTop: `${pageRatio * 100}%`,
          }}
        />
        {inView && blobUrl != null ? (
          <Image className={styles.pageImage} src={blobUrl} />
        ) : null}
      </div>
    </div>
  );
}

export const pageQuery = graphql`
  query BookByName($name: String!) {
    bookMeta: json(name: { eq: $name }) {
      dimensions
      name
    }
    bookPages: allFile(
      sort: { fields: relativePath }
      filter: {
        relativeDirectory: { eq: $name }
        extension: { nin: ["json"] }
        name: { regex: "/^(?!thumbnail).*/" }
      }
    ) {
      edges {
        node {
          relativePath
          publicURL
          name
        }
      }
    }
  }
`;
